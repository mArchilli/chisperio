<?php

namespace App\DataTransferObjects;

use App\Models\CodigoDescuento;

/**
 * Resultado de CalculadoraPedido::calcular(): todo lo que el checkout necesita para
 * escribir un pedido, ya resuelto y sin haber escrito nada. Es un valor inmutable: el
 * que lo recibe decide si crea el pedido, si lo manda a otro sistema, o si lo descarta.
 */
readonly class CalculoPedido
{
    /**
     * @param  array<int, array<string, mixed>>  $items  Filas listas para `pedido_items` (productos sueltos primero, combos después).
     * @param  array{codigoDescuento: ?CodigoDescuento, codigo_descuento_id: ?int, codigo_descuento_texto: ?string, codigo_descuento_tipo: ?string, codigo_descuento_valor: ?float, descuento_monto: float}  $descuento  Resultado de CodigoDescuentoService::resolverParaCheckout() (el cupón se validó pero NO se consumió).
     * @param  array{plan_pago_tarjeta_id: ?int, plan_pago_nombre: ?string, plan_pago_cuotas: ?int, recargo_porcentaje: mixed, recargo_monto: ?float, total_con_recargo: ?float}  $planPago
     */
    public function __construct(
        public array $items,
        public float $subtotal,
        public array $descuento,
        public float $total,
        public array $planPago,
        public float $montoMinimoEnvio,
        public bool $envioGratis,
    ) {
    }

    /**
     * Columnas de `pedidos` que salen del cálculo (todo lo económico y los snapshots de
     * cupón, plan de tarjeta y envío gratis). Quedan afuera los datos del cliente, el
     * estado y la sucursal, que no dependen del cálculo.
     *
     * @return array<string, mixed>
     */
    public function atributosPedido(): array
    {
        return [
            'subtotal' => $this->subtotal,
            'total' => $this->total,
            'codigo_descuento_id' => $this->descuento['codigo_descuento_id'],
            'codigo_descuento_texto' => $this->descuento['codigo_descuento_texto'],
            'codigo_descuento_tipo' => $this->descuento['codigo_descuento_tipo'],
            'codigo_descuento_valor' => $this->descuento['codigo_descuento_valor'],
            'descuento_monto' => $this->descuento['descuento_monto'],
            'envio_gratis' => $this->envioGratis,
            'envio_gratis_monto_minimo' => $this->montoMinimoEnvio,
            ...$this->planPago,
        ];
    }

    public function codigoDescuento(): ?CodigoDescuento
    {
        return $this->descuento['codigoDescuento'];
    }
}
