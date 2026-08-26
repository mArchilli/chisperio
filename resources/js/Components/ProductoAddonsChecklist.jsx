const formatPrice = (price) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);

/** precio_override del pivot si existe, si no el precio por defecto del addon. */
function precioAddon(addon) {
    const override = addon.pivot?.precio_override;
    return override !== null && override !== undefined ? Number(override) : Number(addon.precio);
}

/**
 * Checklist de add-ons para la ficha de producto. `seleccionados` es un array de
 * ids (controlado por el padre, ShowProduct.jsx); `textos` es un mapa
 * { [addonId]: string } con lo que el cliente escribió para los add-ons que
 * requieren texto (ej. nombre a grabar). Un addon con requiere_texto tildado pero
 * sin texto cargado se considera inválido — el padre es quien bloquea "Agregar al
 * carrito" en ese caso, este componente solo muestra el estado.
 */
export default function ProductoAddonsChecklist({ addons, seleccionados, textos, onToggle, onTextoChange }) {
    if (!addons || addons.length === 0) return null;

    return (
        <div className="mb-5">
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#4b4356]">
                Personalizá tu producto
            </p>
            <div className="space-y-2.5">
                {addons.map((addon) => {
                    const tildado = seleccionados.includes(addon.id);
                    const texto = textos[addon.id] ?? '';
                    const faltaTexto = tildado && addon.requiere_texto && texto.trim().length === 0;

                    return (
                        <div
                            key={addon.id}
                            className={`rounded-2xl border-2 p-3.5 transition-all ${
                                tildado ? 'border-[#6000ca]/25 bg-[#6000ca]/[0.03]' : 'border-black/[0.06] bg-white'
                            }`}
                        >
                            <label className="flex cursor-pointer items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={tildado}
                                    onChange={() => onToggle(addon.id)}
                                    className="mt-0.5 h-5 w-5 flex-shrink-0 rounded border-black/20 text-[#6000ca] focus:ring-[#6000ca]"
                                />
                                <span className="flex flex-1 items-center justify-between gap-3">
                                    <span className="text-sm font-bold text-[#1c1b1b]">{addon.nombre}</span>
                                    <span className="flex-shrink-0 text-sm font-extrabold text-[#6000ca]">
                                        + {formatPrice(precioAddon(addon))}
                                    </span>
                                </span>
                            </label>

                            {tildado && addon.requiere_texto && (
                                <div className="mt-2.5 pl-8">
                                    <input
                                        type="text"
                                        value={texto}
                                        onChange={(e) => onTextoChange(addon.id, e.target.value.slice(0, addon.max_caracteres ?? undefined))}
                                        placeholder={addon.placeholder_texto || 'Escribí acá'}
                                        maxLength={addon.max_caracteres ?? undefined}
                                        required
                                        aria-required="true"
                                        aria-invalid={faltaTexto}
                                        className={`block w-full rounded-xl border text-sm shadow-sm focus:ring focus:ring-opacity-50 ${
                                            faltaTexto
                                                ? 'border-[#ba1a1a]/40 focus:border-[#ba1a1a] focus:ring-[#ba1a1a]'
                                                : 'border-black/10 focus:border-[#6000ca] focus:ring-[#6000ca]'
                                        }`}
                                    />
                                    <div className="mt-1 flex items-center justify-between text-[10px] font-semibold">
                                        <span className={faltaTexto ? 'text-[#ba1a1a]' : 'text-[#81788a]'}>
                                            {faltaTexto ? 'Obligatorio para agregar este add-on.' : ' '}
                                        </span>
                                        {addon.max_caracteres != null && (
                                            <span className="flex-shrink-0 text-[#81788a]">
                                                {texto.length}/{addon.max_caracteres}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
