import { usePage } from '@inertiajs/react';

const formatPrice = (price) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);

export default function BarraEnvioGratis({ subtotal }) {
    const { configuracionEnvio } = usePage().props;
    const montoMinimo = configuracionEnvio?.montoMinimo ?? 0;

    // 0 = la feature está desactivada desde el admin.
    if (!montoMinimo || montoMinimo <= 0) {
        return null;
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
        </div>
    );
}
