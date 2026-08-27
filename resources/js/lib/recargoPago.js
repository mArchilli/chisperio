/**
 * Espeja en cliente App\Services\RecargoPagoService (backend) para poder simular el
 * recargo por plan de pago con tarjeta sin ida y vuelta al servidor, mismo criterio
 * que pricing.js. El recargo es un cargo único sobre el total pasado (no compuesto
 * cuota a cuota) — "cuotas sin interés mensual" según el plan.
 */

import { redondear2 } from '@/lib/pricing';

/**
 * @param {number} totalPedido
 * @param {{cuotas: number, recargo_porcentaje: number|string}} plan
 * @returns {{recargo_monto: number, total_con_recargo: number, monto_por_cuota: number}}
 */
export function calcular(totalPedido, plan) {
    const recargoMonto = redondear2(totalPedido * (Number(plan.recargo_porcentaje) / 100));
    const totalConRecargo = redondear2(totalPedido + recargoMonto);
    const montoPorCuota = redondear2(totalConRecargo / plan.cuotas);

    return {
        recargo_monto: recargoMonto,
        total_con_recargo: totalConRecargo,
        monto_por_cuota: montoPorCuota,
    };
}
