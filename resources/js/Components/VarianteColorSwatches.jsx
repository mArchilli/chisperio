/**
 * Una variante sin stock (y no ilimitada) se sigue mostrando pero deshabilitada y
 * tachada — mismo criterio visual que "Sin stock" en el listado (Tienda.jsx/
 * ShowProduct.jsx), no se oculta directamente para que el cliente vea que existió
 * esa opción. Las variantes inactivas ni siquiera llegan acá: TiendaController::show
 * ya las filtra antes de mandarlas por Inertia.
 */
function varianteSinStock(variante) {
    return variante.stock !== null && variante.stock !== undefined && variante.stock <= 0;
}

// Exportado para que el carrito (CartButton.jsx/Carrito.jsx) pinte el mismo
// ícono arcoíris en vez del swatch fijo cuando la línea es de esta variante.
export const GRADIENTE_PERSONALIZADO = 'conic-gradient(from 180deg, #ff3b30, #ff9500, #ffcc00, #34c759, #007aff, #af52de, #ff3b30)';

/**
 * Swatches de color para elegir la variante del producto. `value` es el id de la
 * variante seleccionada (o null si todavía no eligió ninguna) — el padre
 * (ShowProduct.jsx) es quien decide si bloquea "Agregar al carrito" mientras sea null.
 *
 * Una variante con `es_color_personalizado` se pinta como un swatch arcoíris (su
 * color_hex es solo el ícono de referencia que cargó el admin, no el color real) y,
 * al elegirla, despliega un input de color libre + un texto opcional para que el
 * cliente describa lo que quiere. `colorPersonalizado`/`textoPersonalizado` y sus
 * setters viven en el padre porque hacen falta también para armar el carrito.
 */
export default function VarianteColorSwatches({
    variantes,
    value,
    onChange,
    colorPersonalizado = '',
    textoPersonalizado = '',
    onColorPersonalizadoChange,
    onTextoPersonalizadoChange,
    className = 'mb-5',
}) {
    if (!variantes || variantes.length === 0) return null;

    const seleccionada = variantes.find((v) => v.id === value) ?? null;
    const esPersonalizada = seleccionada?.es_color_personalizado ?? false;
    const faltaCompletarPersonalizado = esPersonalizada
        && colorPersonalizado.trim() === ''
        && textoPersonalizado.trim() === '';

    return (
        <div className={className}>
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#4b4356]">
                Elegí un color {value === null && <span className="text-[#ba1a1a]">*</span>}
            </p>
            <div className="flex flex-wrap gap-3">
                {variantes.map((variante) => {
                    const agotada = varianteSinStock(variante);
                    const seleccionadaBtn = variante.id === value;
                    const personalizada = !!variante.es_color_personalizado;

                    return (
                        <button
                            key={variante.id}
                            type="button"
                            onClick={() => !agotada && onChange(variante.id)}
                            disabled={agotada}
                            aria-pressed={seleccionadaBtn}
                            aria-label={`${variante.nombre}${agotada ? ' (sin stock)' : ''}`}
                            title={agotada ? `${variante.nombre} — sin stock` : variante.nombre}
                            className={`group relative flex flex-col items-center gap-1.5 rounded-2xl border-2 p-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 ${
                                agotada
                                    ? 'cursor-not-allowed border-black/[0.06] opacity-50'
                                    : seleccionadaBtn
                                        ? 'border-[#6000ca] shadow-[0_8px_20px_-12px_rgba(96,0,202,0.6)]'
                                        : 'border-transparent hover:border-[#6000ca]/30'
                            }`}
                        >
                            <span
                                className={`relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-black/10 shadow-sm ${agotada ? 'grayscale' : ''}`}
                                style={personalizada ? { background: GRADIENTE_PERSONALIZADO } : { backgroundColor: variante.color_hex || '#e5e5e5' }}
                            >
                                {agotada && (
                                    <span className="absolute inset-0 flex items-center justify-center">
                                        <span className="h-[1.5px] w-full rotate-45 bg-[#ba1a1a]/70" />
                                    </span>
                                )}
                                {seleccionadaBtn && !agotada && (
                                    <svg className="h-4 w-4 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                                {personalizada && !seleccionadaBtn && !agotada && (
                                    <svg className="h-4 w-4 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                    </svg>
                                )}
                            </span>
                            <span className={`text-[10px] font-bold ${agotada ? 'text-[#b8afc0] line-through' : 'text-[#4b4356]'}`}>
                                {variante.nombre}
                            </span>
                        </button>
                    );
                })}
            </div>

            {esPersonalizada && (
                <div className="mt-4 rounded-2xl border-2 border-[#6000ca]/15 bg-[#6000ca]/[0.03] p-4">
                    <p className="mb-3 text-xs font-bold text-[#4b4356]">
                        Elegí el color que quieras y contanos cómo lo imaginás.
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
