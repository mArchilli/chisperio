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

/**
 * Swatches de color para elegir la variante del producto. `value` es el id de la
 * variante seleccionada (o null si todavía no eligió ninguna) — el padre
 * (ShowProduct.jsx) es quien decide si bloquea "Agregar al carrito" mientras sea null.
 */
export default function VarianteColorSwatches({ variantes, value, onChange }) {
    if (!variantes || variantes.length === 0) return null;

    return (
        <div className="mb-5">
            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#4b4356]">
                Elegí un color {value === null && <span className="text-[#ba1a1a]">*</span>}
            </p>
            <div className="flex flex-wrap gap-3">
                {variantes.map((variante) => {
                    const agotada = varianteSinStock(variante);
                    const seleccionada = variante.id === value;

                    return (
                        <button
                            key={variante.id}
                            type="button"
                            onClick={() => !agotada && onChange(variante.id)}
                            disabled={agotada}
                            aria-pressed={seleccionada}
                            aria-label={`${variante.nombre}${agotada ? ' (sin stock)' : ''}`}
                            title={agotada ? `${variante.nombre} — sin stock` : variante.nombre}
                            className={`group relative flex flex-col items-center gap-1.5 rounded-2xl border-2 p-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 ${
                                agotada
                                    ? 'cursor-not-allowed border-black/[0.06] opacity-50'
                                    : seleccionada
                                        ? 'border-[#6000ca] shadow-[0_8px_20px_-12px_rgba(96,0,202,0.6)]'
                                        : 'border-transparent hover:border-[#6000ca]/30'
                            }`}
                        >
                            <span
                                className={`relative flex h-9 w-9 items-center justify-center rounded-full border border-black/10 shadow-sm ${agotada ? 'grayscale' : ''}`}
                                style={{ backgroundColor: variante.color_hex || '#e5e5e5' }}
                            >
                                {agotada && (
                                    <span className="absolute inset-0 flex items-center justify-center">
                                        <span className="h-[1.5px] w-full rotate-45 bg-[#ba1a1a]/70" />
                                    </span>
                                )}
                                {seleccionada && !agotada && (
                                    <svg className="h-4 w-4 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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
        </div>
    );
}
