import { GRADIENTE_PERSONALIZADO } from '@/Components/VarianteColorSwatches';

const formatPrice = (price) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);

/**
 * Mismo criterio que VarianteColorSwatches: una variante sin stock (y no ilimitada)
 * se muestra igual pero deshabilitada, no se oculta.
 */
function varianteSinStock(variante) {
    return variante.stock !== null && variante.stock !== undefined && variante.stock <= 0;
}

function topeStock(variante) {
    return variante.stock === null || variante.stock === undefined
        ? Infinity
        : Math.max(0, variante.stock);
}

/**
 * Repartidor de una cantidad (`qty`) entre las variantes de color del producto: un
 * contador por color, para que el cliente pida "2 de un color, 3 de otro" en una
 * sola compra. Cada color entra al carrito como su propia línea (ver
 * ShowProduct.addToCart), pero el precio por cantidad se calcula sobre el total de
 * `qty` unidades (ver CartContext.cantidadPorProducto / PricingService).
 *
 * Se muestra solo cuando `qty > 1` y hay 2+ colores; con `qty === 1` la ficha sigue
 * usando VarianteColorSwatches. El estado (`asignaciones` = { [varianteId]: count })
 * y el del color a elección viven en el padre porque hacen falta para armar el carrito.
 */
export default function RepartoVariantes({
    variantes,
    qty,
    asignaciones,
    onChange,
    precioBaseUnitario,
    colorPersonalizado = '',
    textoPersonalizado = '',
    onColorPersonalizadoChange,
    onTextoPersonalizadoChange,
}) {
    if (!variantes || variantes.length === 0) return null;

    const sumAsignado = variantes.reduce((suma, v) => suma + (asignaciones[v.id] ?? 0), 0);
    const faltan = qty - sumAsignado;
    const completo = faltan === 0;

    const personalizadaConUnidades = variantes.find(
        (v) => v.es_color_personalizado && (asignaciones[v.id] ?? 0) > 0
    );
    const recargoPersonalizado = Number(personalizadaConUnidades?.precio_adicional ?? 0);
    const faltaCompletarPersonalizado = personalizadaConUnidades
        && colorPersonalizado.trim() === ''
        && textoPersonalizado.trim() === '';

    return (
        <div className="mb-5">
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#4b4356]">
                Repartí las {qty} unidades entre los colores
            </p>
            <p className="mb-3 text-[11px] font-medium text-[#81788a]">
                Poné cuántas querés de cada color. Podés dejar todas en uno solo.
            </p>

            <div className="divide-y divide-black/[0.06] overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
                {variantes.map((variante) => {
                    const count = asignaciones[variante.id] ?? 0;
                    const agotada = varianteSinStock(variante);
                    const cap = topeStock(variante);
                    const recargo = Number(variante.precio_adicional ?? 0);
                    const personalizada = !!variante.es_color_personalizado;
                    const puedeSumar = !agotada && count < cap && sumAsignado < qty;
                    const puedeRestar = count > 0;

                    return (
                        <div
                            key={variante.id}
                            className={`flex items-center gap-3 px-3 py-2.5 ${agotada ? 'opacity-50' : ''}`}
                        >
                            <span
                                className={`relative flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/10 shadow-sm ${agotada ? 'grayscale' : ''}`}
                                style={
                                    personalizada
                                        ? { background: GRADIENTE_PERSONALIZADO }
                                        : { backgroundColor: variante.color_hex || '#e5e5e5' }
                                }
                                aria-hidden="true"
                            >
                                {agotada && (
                                    <span className="absolute inset-0 flex items-center justify-center">
                                        <span className="h-[1.5px] w-full rotate-45 bg-[#ba1a1a]/70" />
                                    </span>
                                )}
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className={`truncate text-[13px] font-bold ${agotada ? 'text-[#b8afc0] line-through' : 'text-[#1c1b1b]'}`}>
                                    {variante.nombre}
                                </p>
                                <p className="text-[11px] font-semibold text-[#81788a]">
                                    {agotada ? (
                                        'Sin stock'
                                    ) : (
                                        <>
                                            {formatPrice(precioBaseUnitario + recargo)} c/u
                                            {recargo > 0 && (
                                                <span className="text-[#6000ca]"> · +{formatPrice(recargo)}</span>
                                            )}
                                        </>
                                    )}
                                </p>
                            </div>

                            <div className="flex flex-shrink-0 items-center rounded-full border border-black/[0.08] bg-[#f7f6f9] px-1">
                                <button
                                    type="button"
                                    onClick={() => onChange(variante.id, count - 1)}
                                    disabled={!puedeRestar}
                                    aria-label={`Quitar una unidad de ${variante.nombre}`}
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold leading-none text-[#6000ca] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] active:scale-90 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent"
                                >
                                    −
                                </button>
                                <span className="min-w-8 select-none text-center text-sm font-black text-[#1c1b1b]">
                                    {count}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onChange(variante.id, count + 1)}
                                    disabled={!puedeSumar}
                                    aria-label={`Agregar una unidad de ${variante.nombre}`}
                                    title={
                                        !agotada && count >= cap
                                            ? `Solo hay ${cap} de este color`
                                            : sumAsignado >= qty
                                                ? `Ya asignaste las ${qty} unidades`
                                                : undefined
                                    }
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold leading-none text-[#6000ca] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] active:scale-90 disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <p
                className={`mt-2 text-[11px] font-bold ${
                    completo ? 'text-[#1c8a4c]' : 'text-amber-600'
                }`}
            >
                {completo
                    ? `Asignaste las ${qty} unidades ✓`
                    : faltan > 0
                        ? `Asignaste ${sumAsignado} de ${qty} · faltan ${faltan}`
                        : `Asignaste ${sumAsignado} de ${qty} · sacá ${-faltan}`}
            </p>

            {personalizadaConUnidades && (
                <div className="mt-3 rounded-2xl border-2 border-[#6000ca]/15 bg-[#6000ca]/[0.03] p-4">
                    <p className="mb-3 text-xs font-bold text-[#4b4356]">
                        Contanos cómo imaginás el color a elección ({personalizadaConUnidades.nombre}).
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={colorPersonalizado || '#6000ca'}
                                onChange={(e) => onColorPersonalizadoChange(e.target.value)}
                                className="h-11 w-14 flex-shrink-0 cursor-pointer rounded-lg border border-black/10 p-0.5"
                                aria-label="Elegir color personalizado"
                            />
                            <span className="text-[11px] font-semibold text-[#81788a]">Color de referencia</span>
                        </div>
                        <input
                            type="text"
                            value={textoPersonalizado}
                            onChange={(e) => onTextoPersonalizadoChange(e.target.value)}
                            placeholder='Describilo (ej: "Dorado metalizado")'
                            className="block w-full rounded-xl border-black/10 text-sm shadow-sm focus:border-[#6000ca] focus:ring focus:ring-[#6000ca] focus:ring-opacity-50"
                        />
                    </div>
                    {recargoPersonalizado > 0 && (
                        <p className="mt-2 text-[11px] font-semibold text-[#6000ca]">
                            El color a elección tiene un costo extra de +{formatPrice(recargoPersonalizado)} por unidad, ya incluido en el total.
                        </p>
                    )}
                    {faltaCompletarPersonalizado && (
                        <p className="mt-2 text-[11px] font-bold text-[#ba1a1a]">
                            Elegí un color o escribí una descripción para poder agregarlo al carrito.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
