import { itemsIncluidosCombo } from '@/lib/combo';

/**
 * Detalle de una línea de combo del carrito (mini carrito, página del carrito y resumen
 * del checkout): qué productos incluye (con su color) y si el combo trae envío gratis.
 * Un combo no tiene `variante` ni `addons` como un producto suelto, así que estas vistas
 * no pueden reusar el bloque de variante/add-ons.
 *
 * `compact`: tamaño chico para el mini carrito y el resumen del checkout.
 * `envioGratisAplica`: si el envío gratis del combo está vigente para este carrito (solo
 * cuando es lo único que se compra, ver lib/envioGratis). Si el combo lo tiene pero hay
 * otros ítems, se aclara que no aplica en vez de prometer un envío gratis que no va a haber.
 */
export default function ComboLineaDetalle({ item, compact = false, envioGratisAplica = true, className = '' }) {
    const incluidos = itemsIncluidosCombo(item);
    const envioGratis = Boolean(item.combo?.envio_gratis);

    if (incluidos.length === 0 && !envioGratis) return null;

    return (
        <div className={className}>
            {incluidos.length > 0 && (
                <ul className="space-y-0.5">
                    {incluidos.map((comboItem) => (
                        <li
                            key={comboItem.id}
                            className={`flex flex-wrap items-center gap-1.5 font-medium leading-snug ${
                                compact ? 'text-[10px] text-[#7c7388]' : 'text-[11px] text-[#81788a]'
                            }`}
                        >
                            <span>
                                {comboItem.cantidad} × {comboItem.titulo}
                            </span>
                            {comboItem.varianteNombre && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-black/[0.06] bg-[#f7f6f9] px-2 py-0.5 text-[10px] font-bold text-[#4b4356]">
                                    <span
                                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full border border-black/10"
                                        style={{ backgroundColor: comboItem.varianteColorHex || '#e5e5e5' }}
                                        aria-hidden="true"
                                    />
                                    {comboItem.varianteNombre}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {envioGratis && envioGratisAplica && (
                <span
                    className={`inline-flex items-center gap-1 rounded-full bg-[#40B0C2]/10 font-extrabold uppercase tracking-wide text-[#2f8a99] ${
                        incluidos.length > 0 ? 'mt-1.5' : ''
                    } ${compact ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'}`}
                >
                    🚚 Envío gratis
                </span>
            )}
            {envioGratis && !envioGratisAplica && (
                <p className={`font-semibold leading-snug text-[#81788a] ${incluidos.length > 0 ? 'mt-1.5' : ''} ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
                    🚚 Este combo tiene envío gratis solo si lo comprás solo
                </p>
            )}
        </div>
    );
}
