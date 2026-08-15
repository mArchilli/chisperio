import { resolverEscalaAplicable, resolverPrecio } from '@/lib/pricing';
import { cantidadMaxima } from '@/lib/stock';

/**
 * Un pill por nivel de precio del producto: "1" (precio base) + uno por cada
 * escala (`cantidad_minima+`). Tocar un pill actualiza `qty` al mínimo de ese
 * nivel — el mismo estado que ya controla el selector de cantidad manual, así
 * que no hace falta lógica de cálculo nueva acá, solo resolverPrecio() para el
 * texto de ahorro de cada nivel.
 *
 * El pill activo es el nivel en efecto para `qty` (la escala de mayor
 * cantidad_minima que `qty` cumple), no una coincidencia exacta: con escalas en
 * 5 y 100, qty=37 marca el pill "5+" como activo.
 */
export default function PillsCantidad({ producto, qty, onChange, size = 'md', className = '' }) {
    const escalas = producto.escalas_precio || [];
    if (escalas.length === 0) return null;

    const escalaActiva = resolverEscalaAplicable(escalas, qty);
    const cantidadActiva = escalaActiva ? escalaActiva.cantidad_minima : 1;
    const maxStock = cantidadMaxima(producto);

    const niveles = [
        { cantidad: 1, key: 'base' },
        ...escalas.map((escala) => ({ cantidad: escala.cantidad_minima, key: escala.id })),
    ];

    const sizeClasses = size === 'sm'
        ? 'px-2.5 py-1 text-[10px] gap-1'
        : 'px-3.5 py-2 text-[11px] gap-1.5';

    return (
        <div
            role="group"
            aria-label="Cantidad rápida por escala de precio"
            className={`flex flex-wrap gap-1.5 ${className}`}
        >
            {niveles.map((nivel) => {
                const precioInfo = resolverPrecio(producto, nivel.cantidad);
                const activo = nivel.cantidad === cantidadActiva;
                const ahorro = Math.round(precioInfo.ahorroTotalPorcentaje);
                // Este nivel pide más unidades de las que hay disponibles: se deshabilita en
                // vez de ocultarse, para que el usuario entienda que existe pero no alcanza,
                // no que el producto no tiene ese nivel de precio.
                const sinStockSuficiente = maxStock !== null && nivel.cantidad > maxStock;

                return (
                    <button
                        key={nivel.key}
                        type="button"
                        onClick={() => !sinStockSuficiente && onChange(nivel.cantidad)}
                        disabled={sinStockSuficiente}
                        aria-pressed={activo}
                        aria-describedby={sinStockSuficiente ? `pill-stock-${producto.id}-${nivel.key}` : undefined}
                        title={sinStockSuficiente ? `Solo quedan ${maxStock} disponibles` : undefined}
                        className={`inline-flex flex-shrink-0 items-center rounded-full border font-extrabold uppercase tracking-[0.04em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-1 active:scale-95 ${sizeClasses} ${
                            sinStockSuficiente
                                ? 'cursor-not-allowed border-black/[0.06] bg-black/[0.02] text-[#b8afc0] line-through'
                                : activo
                                    ? 'border-[#6000ca] bg-[#6000ca] text-white shadow-sm shadow-[#6000ca]/25'
                                    : 'border-black/[0.08] bg-white text-[#4b4356] hover:border-[#6000ca]/40 hover:text-[#6000ca]'
                        }`}
                    >
                        <span>{nivel.cantidad === 1 ? '1' : `${nivel.cantidad}+`}</span>
                        {sinStockSuficiente ? (
                            <span className="sr-only" id={`pill-stock-${producto.id}-${nivel.key}`}>
                                Solo quedan {maxStock} unidades disponibles, no alcanza para este nivel
                            </span>
                        ) : (
                            ahorro > 0 && (
                                <span className={activo ? 'text-[#ffd8ed]' : 'text-[#FF00D4]'}>
                                    -{ahorro}%
                                </span>
                            )
                        )}
                    </button>
                );
            })}
        </div>
    );
}
