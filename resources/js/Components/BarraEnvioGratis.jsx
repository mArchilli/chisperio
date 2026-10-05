import { usePage } from '@inertiajs/react';

const formatPrice = (price) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);

/**
 * Barra de envío gratis del carrito/checkout.
 *
 * `porCombo`: el carrito es únicamente un combo (o combos) con envío gratis propio — ver
 * lib/envioGratis. Vale aunque el monto mínimo esté desactivado o sin alcanzar, y se
 * apaga solo en cuanto se agrega cualquier otro ítem (ahí vuelve a regir el monto).
 *
 * `avisoCombo`: el carrito tiene un combo con envío gratis. Sirve para explicar la
 * condición (solo si se compra solo y, si no, rige el monto que fija el admin). Solo se
 * pasa en true cuando hay un combo con envío gratis: si el combo no lo tiene, no hay nada
 * que aclarar y rige directamente el monto.
 */
export default function BarraEnvioGratis({ subtotal, porCombo = false, avisoCombo = false }) {
    const { configuracionEnvio } = usePage().props;
    const montoMinimo = configuracionEnvio?.montoMinimo ?? 0;
    const hayMonto = montoMinimo > 0;
    const alcanzadoPorMonto = hayMonto && subtotal >= montoMinimo;

    if (porCombo && !alcanzadoPorMonto) {
        return (
            <div className="rounded-[1.5rem] border border-[#1c8a4c]/20 bg-[#f1faf4] p-4">
                <p className="mb-2 text-sm font-extrabold text-[#1c8a4c]">¡Envío gratis por tu combo! 🎉</p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white">
                    <div className="h-full w-full rounded-full bg-[#1c8a4c]" />
                </div>
                <p className="mt-2.5 text-[11px] font-medium leading-snug text-[#4b4356]">
                    Es válido comprando solo el combo. Si sumás otros productos,{' '}
                    {hayMonto ? (
                        <>
                            el envío gratis pasa a depender del monto: desde{' '}
                            <span className="font-extrabold text-[#6000ca]">{formatPrice(montoMinimo)}</span> de compra.
                        </>
                    ) : (
                        'este envío gratis deja de aplicar.'
                    )}
                </p>
            </div>
        );
    }

    // Hay un combo con envío gratis pero ya no aplica (se sumó otro ítem): se explica el motivo.
    // Si igual se alcanzó el monto, la barra ya dice que el envío es gratis y no hace falta más.
    const avisoPerdida = avisoCombo && !porCombo && !alcanzadoPorMonto && (
        <p className="mt-2.5 rounded-xl bg-white/70 px-3 py-2 text-[11px] font-medium leading-snug text-[#4b4356]">
            🚚 El envío gratis de tu combo aplica solo si lo comprás solo. Al sumar otros productos{' '}
            {hayMonto ? (
                <>
                    rige el envío gratis desde{' '}
                    <span className="font-extrabold text-[#6000ca]">{formatPrice(montoMinimo)}</span> de compra.
                </>
            ) : (
                'deja de aplicar.'
            )}
        </p>
    );

    // 0 = la feature de monto está desactivada desde el admin.
    if (!hayMonto) {
        return avisoPerdida ? (
            <div className="rounded-[1.5rem] border border-[#6000ca]/10 bg-[#f7f4fa] p-4">{avisoPerdida}</div>
        ) : null;
    }

    const alcanzado = subtotal >= montoMinimo;
    const porcentaje = Math.min(100, (subtotal / montoMinimo) * 100);
    const faltante = Math.max(0, montoMinimo - subtotal);

    return (
        <div className="rounded-[1.5rem] border border-[#6000ca]/10 bg-[#f7f4fa] p-4">
            {alcanzado ? (
                <p className="mb-2 text-sm font-extrabold text-[#1c8a4c]">
                    ¡Envío gratis desbloqueado! 🎉
                </p>
            ) : (
                <p className="mb-2 text-sm font-medium text-[#4b4356]">
                    Te faltan{' '}
                    <span className="font-extrabold text-[#6000ca]">{formatPrice(faltante)}</span>{' '}
                    para envío gratis
                </p>
            )}
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#f7f4fa]">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${
                        alcanzado ? 'bg-[#1c8a4c]' : 'bg-gradient-to-r from-[#6000ca] to-[#FF00D4]'
                    }`}
                    style={{ width: `${porcentaje}%` }}
                />
            </div>
            {avisoPerdida}
        </div>
    );
}
