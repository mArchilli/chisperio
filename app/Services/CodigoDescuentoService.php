<?php

namespace App\Services;

use App\Enums\TipoDescuento;
use App\Models\CodigoDescuento;
use App\Models\Pedido;
use Illuminate\Validation\ValidationException;

class CodigoDescuentoService
{
    /**
     * Valida un código de descuento contra un subtotal y calcula cuánto descontaría.
     *
     * IMPORTANTE: esto es una previsualización para UX — la usa el carrito antes de
     * llegar al checkout, y confía en el $subtotal que le manda el frontend. NO es
     * el lugar donde se garantiza la integridad del descuento: esa garantía real
     * (recalcular todo desde cero en el servidor, sin confiar en nada que mande el
     * cliente) es responsabilidad de resolverParaCheckout(), usada por
     * PedidoController::store() dentro de la transacción del checkout (Fase 4).
     *
     * Tampoco incrementa usos_actuales — eso ocurre una sola vez, al confirmarse un
     * pedido real. No llamar a este método pensando que ya consume el uso.
     */
    public function validar(string $codigo, float $subtotal): array
    {
        $codigoNormalizado = strtoupper(trim($codigo));

        $codigoDescuento = CodigoDescuento::where('codigo', $codigoNormalizado)->first();

        if ($codigoDescuento === null) {
            return $this->respuestaInvalida('Código inválido', $subtotal);
        }

        $motivo = $this->motivoInvalidez($codigoDescuento);

        if ($motivo !== null) {
            return $this->respuestaInvalida($motivo, $subtotal);
        }

        $montoDescuento = $this->calcularMontoDescuento($codigoDescuento, $subtotal);

        return [
            'valido' => true,
            'motivo' => null,
            'codigo_descuento_id' => $codigoDescuento->id,
            'tipo_descuento' => $codigoDescuento->tipo_descuento->value,
            'valor_descuento' => (float) $codigoDescuento->valor_descuento,
            'monto_descuento' => $montoDescuento,
            'subtotal_con_descuento' => round($subtotal - $montoDescuento, 2),
        ];
    }

    /**
     * Resuelve y valida el código de descuento para el checkout REAL (Fase 4). A
     * diferencia de validar(), hace el lookup CON lockForUpdate() — debe llamarse
     * dentro de una transacción ya abierta por el caller (PedidoController::store),
     * para que dos checkouts concurrentes sobre el mismo código (ej. limite_usos=1)
     * no pasen ambos la validación antes de que ninguno incremente usos_actuales.
     *
     * A diferencia de validar() (que nunca lanza, solo devuelve valido=false), este
     * método lanza ValidationException si el código no es válido: el checkout no
     * puede crear el pedido sin el descuento en silencio — si el cliente esperaba
     * el descuento y ya no es válido, tiene que enterarse, no pagar de más.
     *
     * Reusa motivoInvalidez() y calcularMontoDescuento() — las mismas que usa
     * validar() — así que un código nunca da un motivo distinto ni un monto
     * distinto según por dónde se lo consulte.
     *
     * @return array{codigoDescuento: ?CodigoDescuento, codigo_descuento_id: ?int, codigo_descuento_texto: ?string, codigo_descuento_tipo: ?string, codigo_descuento_valor: ?float, descuento_monto: float}
     *
     * @throws ValidationException
     */
    public function resolverParaCheckout(?string $codigo, float $subtotal): array
    {
        $sinDescuento = [
            'codigoDescuento' => null,
            'codigo_descuento_id' => null,
            'codigo_descuento_texto' => null,
            'codigo_descuento_tipo' => null,
            'codigo_descuento_valor' => null,
            'descuento_monto' => 0.0,
        ];

        if ($codigo === null || trim($codigo) === '') {
            return $sinDescuento;
        }

        $codigoNormalizado = strtoupper(trim($codigo));
        $codigoDescuento = CodigoDescuento::where('codigo', $codigoNormalizado)->lockForUpdate()->first();

        $motivo = $codigoDescuento === null
            ? 'Este código ya no es válido, quitalo del carrito e intentá de nuevo.'
            : $this->motivoInvalidez($codigoDescuento);

        if ($motivo !== null) {
            throw ValidationException::withMessages(['codigo_descuento' => $motivo]);
        }

        return [
            'codigoDescuento' => $codigoDescuento,
            'codigo_descuento_id' => $codigoDescuento->id,
            'codigo_descuento_texto' => $codigoDescuento->codigo,
            'codigo_descuento_tipo' => $codigoDescuento->tipo_descuento->value,
            'codigo_descuento_valor' => (float) $codigoDescuento->valor_descuento,
            'descuento_monto' => $this->calcularMontoDescuento($codigoDescuento, $subtotal),
        ];
    }

    /**
     * Libera un uso del código aplicado a un pedido cancelado (contraparte del
     * increment() hecho en el checkout), lockeando la fila igual que
     * resolverParaCheckout() para no pisarse con un checkout concurrente sobre el
     * mismo código. Nunca decrementa por debajo de 0.
     *
     * Si el pedido no tiene código aplicado, o la relación ya no resuelve (código
     * eliminado — aunque hoy el borrado está bloqueado mientras usos_actuales > 0,
     * se cubre igual defensivamente), no hace nada: mismo criterio que
     * StockService::reponer() usa para productos ya inexistentes.
     *
     * El snapshot del código en el Pedido (codigo_descuento_texto, descuento_monto,
     * etc.) NO se toca acá — solo se libera el cupo, el historial del pedido queda
     * intacto.
     */
    public function liberarUso(Pedido $pedido): void
    {
        if ($pedido->codigo_descuento_id === null) {
            return;
        }

        $codigoDescuento = CodigoDescuento::where('id', $pedido->codigo_descuento_id)
            ->lockForUpdate()
            ->first();

        if ($codigoDescuento === null || $codigoDescuento->usos_actuales <= 0) {
            return;
        }

        $codigoDescuento->decrement('usos_actuales');
    }

    /**
     * Motivo específico por el que un código YA CARGADO no es válido ahora mismo, o
     * null si es válido. Única fuente de verdad para el mapeo chequeo→mensaje: la
     * usan tanto validar() (previsualización, sin lock) como resolverParaCheckout()
     * (checkout real, con lock) — así un mismo código nunca puede dar un motivo
     * distinto según por dónde se lo consulte. Los chequeos en sí viven en el
     * modelo (activo, yaComenzo, yaTermino, tieneUsosDisponibles); acá solo se
     * traducen a texto.
     */
    public function motivoInvalidez(CodigoDescuento $codigoDescuento): ?string
    {
        if (! $codigoDescuento->activo) {
            return 'Este código ya no está activo';
        }

        if (! $codigoDescuento->yaComenzo()) {
            return 'Este código todavía no está vigente';
        }

        if ($codigoDescuento->yaTermino()) {
            return 'Este código venció';
        }

        if (! $codigoDescuento->tieneUsosDisponibles()) {
            return 'Este código alcanzó su límite de usos';
        }

        return null;
    }

    /**
     * Porcentaje: proporcional al subtotal. Fijo: topeado al subtotal, para que el
     * total nunca quede negativo. Única fuente de verdad para este cálculo: la usan
     * tanto validar() (sin lock, previsualización) como resolverParaCheckout() (con
     * lock, checkout real) — el monto que se le mostró al cliente en el carrito y el
     * que efectivamente se le cobra salen de la misma fórmula.
     */
    public function calcularMontoDescuento(CodigoDescuento $codigoDescuento, float $subtotal): float
    {
        return $this->calcularMonto($codigoDescuento->tipo_descuento, (float) $codigoDescuento->valor_descuento, $subtotal);
    }

    /**
     * Misma fórmula que calcularMontoDescuento() pero desde el snapshot que guarda el
     * pedido (tipo + valor), sin necesitar el código vivo. Lo usa la edición de un
     * pedido: el descuento se recalcula con las condiciones con las que se compró,
     * aunque el código ya haya vencido o se haya desactivado.
     */
    public function calcularMontoDesdeSnapshot(TipoDescuento $tipo, float $valor, float $subtotal): float
    {
        return $this->calcularMonto($tipo, $valor, $subtotal);
    }

    private function calcularMonto(TipoDescuento $tipo, float $valor, float $subtotal): float
    {
        $monto = match ($tipo) {
            TipoDescuento::Porcentaje => $subtotal * ($valor / 100),
            TipoDescuento::Fijo => min($valor, $subtotal),
        };

        return round(max(0.0, $monto), 2);
    }

    private function respuestaInvalida(string $motivo, float $subtotal): array
    {
        return [
            'valido' => false,
            'motivo' => $motivo,
            'monto_descuento' => 0,
            'subtotal_con_descuento' => $subtotal,
        ];
    }
}
