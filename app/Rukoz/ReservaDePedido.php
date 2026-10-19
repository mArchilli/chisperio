<?php

namespace App\Rukoz;

use App\Enums\EstadoPedido;
use App\Models\Pedido;
use App\Services\CodigoDescuentoService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Rukoz\CoreClient\Errores\AnularDesdeCentralException;
use Rukoz\CoreClient\Errores\IntegracionApagadaException;
use Rukoz\CoreClient\Errores\PedidoInexistenteException;
use Rukoz\CoreClient\Errores\RukozException;
use Rukoz\CoreClient\Facades\Rukoz;

/**
 * Cancelación de un pedido que tiene su stock reservado en el Central (`rukoz_ref`). La usan el admin
 * (`PedidoController::cambiarEstado`) y la cancelación automática a los N días.
 *
 * Orden: primero el Central (HTTP, sin transacción ni locks tomados), después la transacción local (liberar el cupón de
 * forma idempotente + estado). Si el Central no responde —caído, timeout o circuito abierto— el paquete deja la
 * cancelación en su cola de compensaciones (`rukoz:compensaciones` la reintenta cada 5 minutos, hasta 24 horas) y el pedido
 * local se cancela igual, con `rukoz_estado = cancelacion_pendiente` hasta que se resuelva.
 */
final class ReservaDePedido
{
    public function __construct(private readonly CodigoDescuentoService $cupones) {}

    /**
     * @throws ValidationException Si el Central no deja cancelar (ya es una venta confirmada, integración apagada, rechazo).
     */
    public function cancelar(Pedido $pedido, string $motivo): void
    {
        $motivo = mb_substr(trim($motivo) !== '' ? trim($motivo) : 'Cancelado desde la web', 0, 500);
        $respuesta = ['estado' => Pedido::RESERVA_CANCELADA];

        try {
            $respuesta = Rukoz::cancelarReserva($pedido->rukoz_ref, $motivo);
        } catch (PedidoInexistenteException) {
            // El Central no conoce esta referencia: no hay reserva que liberar. Se cancela el pedido local y queda el aviso.
            Log::warning('Sistema Central: se canceló un pedido cuya reserva el Central no conoce.', ['pedido_id' => $pedido->id]);
        } catch (AnularDesdeCentralException) {
            throw ValidationException::withMessages([
                'estado' => 'Este pedido ya es una venta confirmada en el Sistema Central: se anula desde allá.',
            ]);
        } catch (IntegracionApagadaException $e) {
            throw ValidationException::withMessages(['estado' => ErroresDelCentral::paraElAdmin($e, 'cancelar la reserva')]);
        } catch (RukozException $e) {
            ErroresDelCentral::registrar($e, 'cancelar la reserva');

            throw ValidationException::withMessages(['estado' => ErroresDelCentral::paraElAdmin($e, 'cancelar la reserva')]);
        }

        DB::transaction(function () use ($pedido, $respuesta, $motivo) {
            // liberarUso() es idempotente (marca codigo_descuento_liberado_at): un reintento o un evento repetido no libera dos veces.
            $this->cupones->liberarUso($pedido);

            $pedido->update([
                'estado' => EstadoPedido::Cancelado,
                'despachado_at' => null,
                'motivo_cancelacion' => $motivo,
                // null = el Central no respondió: la cancelación quedó en las compensaciones del paquete.
                'rukoz_estado' => $respuesta === null ? Pedido::RESERVA_CANCELACION_PENDIENTE : Pedido::RESERVA_CANCELADA,
                'rukoz_version' => isset($respuesta['version']) ? (int) $respuesta['version'] : $pedido->rukoz_version,
            ]);
        });
    }
}
