import { resolverPrecio } from '@/lib/pricing';

const formatPrice = (price) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);

/**
 * Arma un nivel por cada escala de precio (más el nivel base "1 a X-1") y resuelve
 * el precio de cada uno evaluando la cantidad mínima de ese nivel — así una oferta
 * alcance=especifico solo achica el precio del nivel al que apunta, no de los demás.
 */
function armarNiveles(producto) {
    const escalas = [...(producto.escalas_precio || [])].sort((a, b) => a.cantidad_minima - b.cantidad_minima);
    if (escalas.length === 0) return [];

    const cortes = [1, ...escalas.map((escala) => escala.cantidad_minima)];

    return cortes.map((desde, i) => {
        const hasta = cortes[i + 1] ? cortes[i + 1] - 1 : null;
        const resultado = resolverPrecio(producto, desde);

        return { desde, hasta, ...resultado };
    });
}

export default function TablaPreciosPorCantidad({ producto, qty }) {
    const niveles = armarNiveles(producto);
    if (niveles.length === 0) return null;

    return (
        <div className="mt-6 rounded-[1.5rem] border border-black/[0.05] bg-[#f7f6f9] p-4 sm:p-5">
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#4b4356]">
                Precios por cantidad
            </p>
            <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
                <table className="w-full text-sm">
                    <tbody className="divide-y divide-black/[0.05]">
                        {niveles.map((nivel) => {
                            const activo = qty >= nivel.desde && (nivel.hasta === null || qty <= nivel.hasta);
                            const label = nivel.hasta === null ? `${nivel.desde}+` : `${nivel.desde} a ${nivel.hasta}`;

                            return (
                                <tr
                                    key={nivel.desde}
                                    className={`transition-colors ${activo ? 'bg-[#6000ca]/[0.05]' : ''}`}
                                >
                                    <td className="px-4 py-3 font-semibold text-[#4b4356]">
                                        {label} {activo && <span className="ml-1 text-[10px] font-extrabold uppercase tracking-wide text-[#6000ca]">actual</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {nivel.ofertaAplicada ? (
                                            <span className="inline-flex items-baseline gap-2">
                                                <span className="text-xs font-medium text-[#81788a] line-through">
                                                    {formatPrice(nivel.precioLista)}
                                                </span>
                                                <span className="font-black text-[#6000ca]">
                                                    {formatPrice(nivel.precioFinal)}
                                                </span>
                                            </span>
                                        ) : (
                                            <span className="font-black text-[#1c1b1b]">
                                                {formatPrice(nivel.precioFinal)}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
