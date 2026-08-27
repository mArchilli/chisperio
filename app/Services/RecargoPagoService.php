<?php

namespace App\Services;

use App\Models\PlanPagoTarjeta;

class RecargoPagoService
{
    /**
     * Fuente de verdad del cálculo del recargo por pago con tarjeta. El recargo
     * es un cargo único sobre el total del pedido completo (no por producto, no
     * compuesto cuota a cuota) — "cuotas sin interés mensual" según el plan.
     *
     * @return array{recargo_monto: float, total_con_recargo: float, monto_por_cuota: float}
     */
    public function calcular(float $totalPedido, PlanPagoTarjeta $plan): array
    {
        $recargoMonto = round($totalPedido * ((float) $plan->recargo_porcentaje / 100), 2);
        $totalConRecargo = round($totalPedido + $recargoMonto, 2);
        $montoPorCuota = round($totalConRecargo / $plan->cuotas, 2);

        return [
            'recargo_monto' => $recargoMonto,
            'total_con_recargo' => $totalConRecargo,
            'monto_por_cuota' => $montoPorCuota,
        ];
    }
}
