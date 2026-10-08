import { Link } from '@inertiajs/react';
import toast from 'react-hot-toast';
import { useCart } from '@/Context/CartContext';
import { useSugerenciasCarrito } from '@/hooks/useSugerenciasCarrito';
import { resolverPrecio } from '@/lib/pricing';

const formatPrice = (price) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);

function Imagen({ producto, className }) {
    const ruta = producto.imagen_principal?.ruta;

    return ruta ? (
        <img src={`/${ruta}`} alt={producto.titulo} className={className} loading="lazy" />
    ) : (
        <span className="flex h-full w-full select-none items-center justify-center text-2xl font-black text-[#6000ca]/25">
            {producto.titulo?.charAt(0).toUpperCase()}
        </span>
    );
}

/** "Compatible con …": lo del carrito con lo que sirve esta sugerencia (solo si viene por compatibilidad). */
function CompatibleCon({ producto, className = '' }) {
    const con = producto.compatible_con ?? [];
    if (con.length === 0) return null;

    return (
        <p className={`flex items-start gap-1 text-[11px] font-semibold leading-snug text-[#1c8a4c] ${className}`}>
            <svg
                className="mt-px h-3.5 w-3.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="line-clamp-2">Compatible con {con.join(', ')}</span>
        </p>
    );
}

function Precio({ producto, className = '' }) {
    const { precioBase, precioFinal } = resolverPrecio(producto, 1);

    return (
        <p className={`flex flex-wrap items-baseline gap-x-1.5 ${className}`}>
            <span className="font-black text-[#6000ca]">{formatPrice(precioFinal)}</span>
            {precioFinal < precioBase && (
                <span className="text-[11px] font-medium text-[#81788a] line-through">{formatPrice(precioBase)}</span>
            )}
        </p>
    );
}

/**
 * Acción de una sugerencia: un producto con colores activos no se puede agregar sin
 * elegir uno (PedidoController::store lo rechaza), así que lleva a su ficha; el resto se
 * agrega directo al carrito.
 */
function AccionSugerencia({ producto, onAgregar, compacto }) {
    const base =
        'inline-flex flex-shrink-0 items-center justify-center rounded-full bg-[#6000ca] font-extrabold uppercase tracking-[0.05em] text-white transition-all hover:bg-[#4f00a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95';
    const medida = compacto ? 'h-8 px-3 text-[10px]' : 'h-10 w-full px-4 text-[11px]';

    if (producto.tiene_variantes) {
        return (
            <Link
                href={route('tienda.show', producto.id)}
                className={`${base} ${medida}`}
                aria-label={`Elegir color de ${producto.titulo}`}
            >
                Elegir color
            </Link>
        );
    }

    return (
        <button
            type="button"
            onClick={() => onAgregar(producto)}
            className={`${base} ${medida}`}
            aria-label={`Agregar ${producto.titulo} al carrito`}
        >
            Agregar
        </button>
    );
}

/**
 * "Sumá a tu pedido": productos sugeridos según lo que hay en el carrito (primero los compatibles con él). `variante`
 * "pagina" es la grilla de Carrito.jsx; "drawer" es la lista compacta del modal del carrito.
 */
export default function SugerenciasCarrito({ variante = 'pagina' }) {
    const { items, addToCart } = useCart();
    const sugerencias = useSugerenciasCarrito(items);

    if (sugerencias.length === 0) return null;

    // Si todas llegan por compatibilidad el título lo dice; con alguna genérica queda el neutro.
    const titulo = sugerencias.every((p) => p.compatible_con?.length > 0) ? 'Compatible con tu pedido' : 'Sumá a tu pedido';

    const agregar = (producto) => {
        addToCart(producto, 1);
        toast.success(`${producto.titulo} agregado al carrito`);
    };

    if (variante === 'drawer') {
        return (
            <section aria-labelledby="sugerencias-drawer" className="px-2 pb-3 pt-4">
                <h3
                    id="sugerencias-drawer"
                    className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#6000ca]"
                >
                    {titulo}
                </h3>
                <ul className="space-y-1">
                    {sugerencias.map((producto) => (
                        <li key={producto.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-gray-50">
                            <Link
                                href={route('tienda.show', producto.id)}
                                className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-white"
                                tabIndex={-1}
                                aria-hidden="true"
                            >
                                <Imagen producto={producto} className="h-full w-full object-contain p-1.5" />
                            </Link>
                            <div className="min-w-0 flex-1">
                                <Link
                                    href={route('tienda.show', producto.id)}
                                    className="line-clamp-2 text-sm font-semibold leading-snug text-[#1c1b1b] hover:text-[#6000ca]"
                                >
                                    {producto.titulo}
                                </Link>
                                <CompatibleCon producto={producto} className="mt-0.5" />
                                <Precio producto={producto} className="mt-0.5 text-sm" />
                            </div>
                            <AccionSugerencia producto={producto} onAgregar={agregar} compacto />
                        </li>
                    ))}
                </ul>
            </section>
        );
    }

    return (
        <section aria-labelledby="sugerencias-carrito" className="mt-8 md:mt-10">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#6000ca]">
                Te puede interesar
            </p>
            <h2
                id="sugerencias-carrito"
                className="mb-4 text-xl font-black tracking-tight text-[#1c1b1b] md:mb-5 md:text-2xl"
            >
                {titulo}
            </h2>
            <ul className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
                {sugerencias.map((producto) => (
                    <li
                        key={producto.id}
                        className="flex min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-black/[0.06] bg-white shadow-[0_14px_34px_-26px_rgba(28,27,27,0.55)]"
                    >
                        <Link
                            href={route('tienda.show', producto.id)}
                            className="block aspect-square overflow-hidden bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6000ca]"
                            aria-label={`Ver ${producto.titulo}`}
                        >
                            <Imagen producto={producto} className="h-full w-full object-contain p-4" />
                        </Link>
                        <div className="flex flex-1 flex-col p-3 sm:p-4">
                            <Link
                                href={route('tienda.show', producto.id)}
                                className="line-clamp-2 min-h-10 text-[13px] font-bold leading-snug text-[#1c1b1b] hover:text-[#6000ca]"
                            >
                                {producto.titulo}
                            </Link>
                            <CompatibleCon producto={producto} className="mt-1.5" />
                            <Precio producto={producto} className="mb-3 mt-2 text-base" />
                            <div className="mt-auto">
                                <AccionSugerencia producto={producto} onAgregar={agregar} />
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
