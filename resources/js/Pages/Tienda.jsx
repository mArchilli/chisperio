import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import LandingHeader from '@/Components/Landing/LandingHeader';
import LandingFooter from '@/Components/Landing/LandingFooter';
import { useCart } from '@/Context/CartContext';
import { resolverPrecio } from '@/lib/pricing';
import { TIENDA_PAGE_SIZE, cardDomId, cardKey, saveTiendaReturn } from '@/lib/tiendaReturn';
import { cantidadMaxima, sinStock, tieneStockBajo } from '@/lib/stock';
import PillsCantidad from '@/Components/PillsCantidad';

const formatPrice = (price) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number(price));

function BagIcon({ className = 'h-4 w-4' }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 8.25h10.5l.75 12H6l.75-12z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V6.75a3 3 0 016 0V9" />
        </svg>
    );
}

function ProductImage({ producto }) {
    const imagePath = producto.imagen_principal?.ruta;
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        setImageFailed(false);
    }, [imagePath]);

    if (!imagePath || imageFailed) {
        return (
            <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
                <span className="flex h-20 w-20 items-center justify-center rounded-full border border-[#6000ca]/10 bg-white/80 text-4xl font-black text-[#6000ca]/20 shadow-sm">
                    {producto.titulo?.charAt(0).toUpperCase()}
                </span>
            </div>
        );
    }

    return (
        <img
            src={`/${imagePath}`}
            alt={producto.titulo}
            className="h-full w-full object-contain p-1.5 transition-transform duration-500 group-hover:scale-[1.04] md:p-5"
            loading="lazy"
            onError={() => setImageFailed(true)}
        />
    );
}

function Chip({ active, onClick, children, sub = false }) {
    if (sub) {
        return (
            <button
                type="button"
                onClick={onClick}
                className={`flex-shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.08em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95 ${
                    active
                        ? 'border-[#6000ca] bg-[#6000ca]/10 text-[#6000ca]'
                        : 'border-black/[0.08] bg-[#fcf9f8] text-[#4b4356] hover:border-[#6000ca]/35 hover:text-[#6000ca]'
                }`}
            >
                {children}
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex-shrink-0 whitespace-nowrap rounded-full border px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.07em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95 ${
                active
                    ? 'border-[#6000ca] bg-[#6000ca] text-white shadow-md shadow-[#6000ca]/20'
                    : 'border-black/[0.08] bg-white text-[#4b4356] hover:border-[#6000ca]/35 hover:text-[#6000ca]'
            }`}
        >
            {children}
        </button>
    );
}

function ProductCard({ producto, qty, onQtyChange, onAddToCart }) {
    const precioInfo = resolverPrecio(producto, qty);
    const hasOffer = precioInfo.precioFinal < precioInfo.precioBase;
    const displayPrice = precioInfo.precioFinal;
    const totalPrice = displayPrice * qty;
    const discount = hasOffer ? Math.round(precioInfo.ahorroTotalPorcentaje) : null;
    const maxQty = cantidadMaxima(producto);
    const stockBajo = tieneStockBajo(producto);
    const agotado = sinStock(producto);
    const enElTope = maxQty !== null && qty >= maxQty;
    // Esta card ya agrega al carrito sin pasar por la ficha (botón "Agregar" más abajo),
    // así que la cantidad elegida en los pills es la que se usa ahí directamente. Además
    // propagamos esa cantidad como ?qty= en los links a la ficha, para no resetear a 1
    // si el usuario prefiere seguir eligiendo ahí (ShowProduct la toma como qty inicial).
    const esCombo = producto.tipo === 'combo';
    const productHref = esCombo
        ? route('combos.show', producto.id)
        : route('tienda.show', qty > 1 ? { producto: producto.id, qty } : producto.id);

    return (
        <article
            id={cardDomId(cardKey(producto))}
            data-card-key={cardKey(producto)}
            className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-black/[0.06] bg-white shadow-[0_14px_34px_-26px_rgba(28,27,27,0.55)] transition-all duration-300 hover:-translate-y-1 hover:border-[#6000ca]/20 hover:shadow-[0_24px_45px_-25px_rgba(96,0,202,0.45)]">
            <Link
                href={productHref}
                className="relative block aspect-square overflow-hidden bg-white focus-visible:outline-none md:aspect-[4/3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6000ca]"
                aria-label={`Ver ${producto.titulo}`}
            >
                {/* Mobile: la categoría va como etiqueta sobre la imagen para ahorrar espacio. */}
                <span className="absolute left-2.5 top-2.5 z-10 max-w-[62%] truncate rounded-full border border-[#6000ca]/15 bg-white/90 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#6000ca] shadow-sm backdrop-blur-sm md:hidden">
                    {producto.categorias?.[0]?.nombre ?? 'Chisperío'}
                </span>

                {agotado && (
                    <span className="absolute right-3 top-3 z-10 rounded-full bg-[#ba1a1a] md:left-3 md:right-auto px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-white shadow-lg shadow-red-500/20">
                        Sin stock
                    </span>
                )}

                {!agotado && !hasOffer && producto.is_featured && (
                    <span
                        className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 md:left-3 md:right-auto md:top-3 items-center justify-center text-[#6000ca] drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]"
                        aria-label="Producto destacado"
                    >
                        <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.07 3.29a1 1 0 00.95.69h3.46c.97 0 1.37 1.24.59 1.81l-2.8 2.03a1 1 0 00-.36 1.12l1.07 3.29c.3.92-.76 1.69-1.54 1.12l-2.8-2.03a1 1 0 00-1.18 0l-2.8 2.03c-.78.57-1.84-.2-1.54-1.12l1.07-3.29a1 1 0 00-.36-1.12l-2.8-2.03c-.78-.57-.38-1.81.59-1.81h3.46a1 1 0 00.95-.69l1.07-3.29z" />
                        </svg>
                    </span>
                )}

                {!agotado && hasOffer && (
                    <span className="absolute right-3 top-3 z-10 rounded-full bg-[#FF00D4] px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-white shadow-lg shadow-pink-500/20">
                        {discount}% off
                    </span>
                )}

                {stockBajo && (
                    <span className="absolute bottom-3 left-3 z-10 rounded-full bg-amber-400 px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-amber-900 shadow-lg">
                        {producto.stock === 1 ? '¡Última unidad!' : `Quedan ${producto.stock}`}
                    </span>
                )}

                {esCombo && producto.envio_gratis && !agotado && (
                    <span className="absolute bottom-3 right-3 z-10 rounded-full bg-[#40B0C2] px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-white shadow-lg">
                        🚚 Envío gratis
                    </span>
                )}

                <div className={`h-full w-full ${agotado ? 'opacity-50 grayscale' : ''}`}>
                    <ProductImage producto={producto} />
                </div>
            </Link>

            <div className="flex min-w-0 flex-1 flex-col p-3 md:p-3.5 xl:p-4">
                <p className="mb-2 hidden min-h-4 truncate text-[9px] md:block font-extrabold uppercase tracking-[0.12em] text-[#6000ca] xl:text-[10px]">
                    {producto.categorias?.[0]?.nombre ?? 'Selección Chisperío'}
                </p>

                <Link
                    href={productHref}
                    className="line-clamp-2 min-h-10 text-sm font-extrabold leading-snug text-[#1c1b1b] transition-colors hover:text-[#6000ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 xl:text-[15px]"
                >
                    {producto.titulo}
                </Link>

                <div className="mt-auto border-t border-black/[0.06] pt-3.5">
                    {hasOffer && (
                        <span className="block text-[10px] font-medium leading-none text-[#81788a] line-through">
                            {formatPrice(precioInfo.precioBase * qty)}
                        </span>
                    )}
                    <span className={`block whitespace-nowrap text-lg font-black leading-none text-[#6000ca] ${hasOffer ? 'mt-1.5' : ''}`}>
                        {formatPrice(totalPrice)}
                    </span>
                    {qty > 1 && (
                        <span className="mt-0.5 block whitespace-nowrap text-[10px] font-semibold text-[#81788a]">
                            {formatPrice(displayPrice)} c/u
                        </span>
                    )}
                </div>

                {agotado ? (
                    <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2.5 text-center">
                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#ba1a1a]">
                            Sin stock
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block">
                            <PillsCantidad producto={producto} qty={qty} onChange={onQtyChange} size="sm" className="mt-2.5" />
                        </div>

                        <div className="mt-3 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-2">
                            <div className="grid h-10 flex-shrink-0 grid-cols-[2rem_1.5rem_2rem] items-center overflow-hidden rounded-full border border-black/[0.08] bg-[#fcf9f8]">
                                <button
                                    type="button"
                                    onClick={() => onQtyChange(qty - 1)}
                                    className="flex h-full items-center justify-center text-base font-bold leading-none text-[#6000ca] transition-colors hover:bg-[#6000ca] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6000ca]"
                                    aria-label="Reducir cantidad"
                                >
                                    −
                                </button>
                                <span className="text-center text-xs font-extrabold text-[#1c1b1b] select-none">
                                    {qty}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onQtyChange(Math.min(qty + 1, maxQty ?? Infinity))}
                                    disabled={enElTope}
                                    title={enElTope ? `Solo quedan ${maxQty} disponibles` : undefined}
                                    className="flex h-full items-center justify-center text-base font-bold leading-none text-[#6000ca] transition-colors hover:bg-[#6000ca] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6000ca] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#6000ca]"
                                    aria-label="Aumentar cantidad"
                                >
                                    +
                                </button>
                            </div>

                            {producto.tiene_variantes ? (
                                // Producto con variantes de color activas: agregar directo acá
                                // no pasa por el selector de color, así que en vez de eso manda
                                // a la ficha (ver PedidoController::store, que rechaza un item
                                // sin variante_id cuando el producto la requiere).
                                <Link
                                    href={productHref}
                                    className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-full bg-[#6000ca] px-3 text-[10px] font-extrabold uppercase tracking-[0.05em] text-white shadow-md shadow-[#6000ca]/20 transition-all hover:bg-[#4f00a8] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95"
                                    aria-label={`Elegir color de ${producto.titulo}`}
                                >
                                    <BagIcon className="h-4 w-4 flex-shrink-0" />
                                    <span className="hidden truncate sm:inline">Elegir color</span>
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    onClick={onAddToCart}
                                    className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-full bg-[#6000ca] px-3 text-[10px] font-extrabold uppercase tracking-[0.05em] text-white shadow-md shadow-[#6000ca]/20 transition-all hover:bg-[#4f00a8] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95"
                                    aria-label={`Agregar ${producto.titulo} al carrito`}
                                >
                                    <BagIcon className="h-4 w-4 flex-shrink-0" />
                                    <span className="hidden truncate sm:inline">Agregar</span>
                                </button>
                            )}
                        </div>
                    </>
                )}

                <Link
                    href={productHref}
                    className="mt-2 hidden h-9 w-full md:inline-flex items-center justify-center rounded-full border border-[#6000ca]/25 bg-white px-3 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#6000ca] transition-all hover:border-[#6000ca] hover:bg-[#6000ca] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95"
                >
                    Ver producto
                </Link>
            </div>
        </article>
    );
}

function EmptyState({ onReset }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-[2rem] border border-black/[0.06] bg-white px-6 py-20 text-center shadow-[0_14px_34px_-28px_rgba(28,27,27,0.45)]">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#6000ca]/10">
                <svg className="h-8 w-8 text-[#6000ca]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight text-[#1c1b1b]">Sin resultados</h3>
            <p className="mt-2 text-sm text-[#4b4356]">No hay productos con los filtros seleccionados.</p>
            <button
                type="button"
                onClick={onReset}
                className="mt-6 rounded-full bg-[#6000ca] px-6 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white transition-all hover:bg-[#4f00a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95"
            >
                Ver todos los productos
            </button>
        </div>
    );
}

function CartToast({ message }) {
    return (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full bg-[#1c1b1b] px-5 py-3 text-xs font-semibold text-white shadow-2xl md:bottom-8 md:text-sm">
            <svg className="h-4 w-4 flex-shrink-0 text-[#FF00D4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {message}
        </div>
    );
}

const SEARCH_DEBOUNCE_MS = 400;
const SEARCH_MIN_CHARS = 2;

function FilterIcon({ className = 'h-5 w-5' }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10m-7 6h4" />
        </svg>
    );
}

function CloseIcon({ className = 'h-3.5 w-3.5' }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    );
}

function SheetSection({ title, children }) {
    return (
        <section className="border-b border-black/[0.06] px-5 py-4 last:border-b-0">
            <h3 className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#81788a]">{title}</h3>
            <div className="flex flex-wrap gap-2">{children}</div>
        </section>
    );
}

/**
 * Menú de filtros para mobile (bottom sheet). Trabaja con un borrador y recién
 * navega al tocar "Aplicar", así no se dispara una consulta por cada chip tocado.
 */
function FiltersSheet({ open, onClose, categorias, tipos, initial, onApply }) {
    const [draft, setDraft] = useState(initial);

    useEffect(() => {
        if (open) setDraft(initial);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKeyDown = (event) => event.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open, onClose]);

    if (!open) return null;

    const draftCat = categorias.find((category) => category.id === draft.categoria) ?? null;
    const isPristine = draft.filter === 'todos' && !draft.categoria && !draft.subcategoria;

    return (
        <div className="fixed inset-0 z-[90] md:hidden" role="dialog" aria-modal="true" aria-label="Filtros">
            <button
                type="button"
                className="absolute inset-0 bg-black/45"
                onClick={onClose}
                aria-label="Cerrar filtros"
            />
            <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-[1.75rem] bg-white shadow-2xl">
                <div className="flex items-center justify-between px-5 pb-3 pt-5">
                    <h2 className="text-sm font-black uppercase tracking-[0.1em] text-[#1c1b1b]">Filtros</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fcf9f8] text-[#4b4356] active:scale-95"
                        aria-label="Cerrar"
                    >
                        <CloseIcon className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain border-t border-black/[0.06]">
                    <SheetSection title="Tipo">
                        {tipos.map(({ key, label }) => (
                            <Chip
                                key={key}
                                active={draft.filter === key}
                                onClick={() => setDraft((d) => ({ ...d, filter: key }))}
                            >
                                {label}
                            </Chip>
                        ))}
                    </SheetSection>

                    {categorias.length > 0 && (
                        <SheetSection title="Categoría">
                            {categorias.map((category) => (
                                <Chip
                                    key={category.id}
                                    active={draft.categoria === category.id}
                                    onClick={() =>
                                        setDraft((d) => ({
                                            ...d,
                                            categoria: d.categoria === category.id ? null : category.id,
                                            subcategoria: null,
                                        }))
                                    }
                                >
                                    {category.nombre}
                                </Chip>
                            ))}
                        </SheetSection>
                    )}

                    {draftCat?.subcategorias?.length > 0 && (
                        <SheetSection title={`Subcategoría · ${draftCat.nombre}`}>
                            {draftCat.subcategorias.map((subcategory) => (
                                <Chip
                                    key={subcategory.id}
                                    sub
                                    active={draft.subcategoria === subcategory.id}
                                    onClick={() =>
                                        setDraft((d) => ({
                                            ...d,
                                            subcategoria: d.subcategoria === subcategory.id ? null : subcategory.id,
                                        }))
                                    }
                                >
                                    {subcategory.nombre}
                                </Chip>
                            ))}
                        </SheetSection>
                    )}
                </div>

                <div className="flex gap-3 border-t border-black/[0.06] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <button
                        type="button"
                        onClick={() => setDraft({ filter: 'todos', categoria: null, subcategoria: null })}
                        disabled={isPristine}
                        className="rounded-full border border-black/[0.08] px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.07em] text-[#4b4356] transition-all active:scale-95 disabled:opacity-40"
                    >
                        Limpiar
                    </button>
                    <button
                        type="button"
                        onClick={() => onApply(draft)}
                        className="flex-1 rounded-full bg-[#6000ca] px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.07em] text-white shadow-md shadow-[#6000ca]/20 transition-all active:scale-95"
                    >
                        Aplicar filtros
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Tienda({ productos, categorias, filters, disponibles, canLogin }) {
    const [quantities, setQuantities] = useState({});
    const [toast, setToast] = useState(null);
    const { addToCart: addToCartContext, addComboToCart: addComboToCartContext } = useCart();

    const activeFilter = filters.filter || 'todos';
    const activeCategoriaId = filters.categoria ? Number(filters.categoria) : null;
    const activeSubcategoriaId = filters.subcategoria ? Number(filters.subcategoria) : null;
    const activeCat = categorias.find((category) => category.id === activeCategoriaId) ?? null;
    const activeSubcat = activeCat?.subcategorias?.find((s) => s.id === activeSubcategoriaId) ?? null;
    const [searchTerm, setSearchTerm] = useState(filters.q || '');
    const [searching, setSearching] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const searchInputRef = useRef(null);

    // "Destacados" y "Ofertas" solo se ofrecen si hay productos para mostrar (o si ya
    // es el filtro activo, para que el usuario pueda verlo y salir de ahí).
    const tipos = [
        { key: 'todos', label: 'Todos' },
        ...(disponibles?.destacados || activeFilter === 'destacados' ? [{ key: 'destacados', label: 'Destacados' }] : []),
        ...(disponibles?.ofertas || activeFilter === 'ofertas' ? [{ key: 'ofertas', label: 'Ofertas' }] : []),
        { key: 'combos', label: 'Combos' },
    ];

    const activeFiltersCount =
        (activeFilter !== 'todos' ? 1 : 0) + (activeCategoriaId ? 1 : 0) + (activeSubcategoriaId ? 1 : 0);

    const appliedLabels = [
        activeFilter !== 'todos' ? tipos.find((t) => t.key === activeFilter)?.label : null,
        activeCat?.nombre,
        activeSubcat?.nombre,
    ].filter(Boolean);

    // Sincroniza el input cuando el término cambia desde afuera (navegación, "ver todos"),
    // pero nunca mientras se está escribiendo: una respuesta atrasada pisaría lo tipeado.
    useEffect(() => {
        if (document.activeElement !== searchInputRef.current) {
            setSearchTerm(filters.q || '');
        }
    }, [filters.q]);

    useEffect(() => {
        if (window.location.hash !== '#productos') return undefined;

        const frameId = window.requestAnimationFrame(() => {
            document.getElementById('productos')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        });

        return () => window.cancelAnimationFrame(frameId);
    }, [activeCategoriaId, activeFilter, activeSubcategoriaId]);

    const navigate = (params) => {
        const clean = Object.fromEntries(
            Object.entries(params).filter(([, value]) => value != null && value !== '' && value !== 'todos')
        );
        router.get(route('tienda.index'), clean, {
            preserveState: true,
            replace: true,
            preserveScroll: false,
        });
    };

    const handleSpecialFilter = (filter) =>
        navigate({
            filter,
            categoria: activeCategoriaId,
            subcategoria: activeSubcategoriaId,
            q: filters.q,
        });

    const handleCategory = (categoryId) =>
        navigate({
            filter: activeFilter,
            categoria: activeCategoriaId === categoryId ? null : categoryId,
            q: filters.q,
        });

    const handleSubcategory = (subcategoryId) =>
        navigate({
            filter: activeFilter,
            categoria: activeCategoriaId,
            subcategoria: activeSubcategoriaId === subcategoryId ? null : subcategoryId,
            q: filters.q,
        });

    // "Cargar más": el servidor sigue paginando (24 por tanda), pero el cliente va sumando
    // cada tanda a la lista en vez de reemplazarla. La página 1 (filtro o búsqueda nueva)
    // reinicia la lista. preserveUrl evita que la URL quede en ?page=N, que al recargar
    // mostraría solo esa tanda.
    const [items, setItems] = useState(productos.data);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        setItems((previous) => {
            if (productos.current_page === 1) return productos.data;
            const known = new Set(previous.map((p) => p.id));
            return [...previous, ...productos.data.filter((p) => !known.has(p.id))];
        });
    }, [productos]);

    // Se calcula por cantidad de items y no por current_page/last_page: al volver de una
    // ficha el servidor arma de una sola vez varias tandas (?paginas=N), y ahí esos
    // números dejan de representar tandas de TIENDA_PAGE_SIZE.
    const hasMore = items.length < productos.total;

    const currentQuery = () => {
        const params = {};
        if (filters.filter && filters.filter !== 'todos') params.filter = filters.filter;
        if (filters.categoria) params.categoria = filters.categoria;
        if (filters.subcategoria) params.subcategoria = filters.subcategoria;
        if (filters.q) params.q = filters.q;
        return params;
    };

    // Al tocar una card se recuerda cuál fue y en qué estado estaba el listado, para que
    // "Volver al catálogo" (ver BackToCatalog) lo reconstruya igual.
    const rememberReturnPoint = (event) => {
        const card = event.target.closest('[data-card-key]');
        if (!card) return;
        const tandas = Math.ceil(items.length / TIENDA_PAGE_SIZE);
        saveTiendaReturn(card.dataset.cardKey, {
            ...currentQuery(),
            ...(tandas > 1 ? { paginas: tandas } : {}),
        });
    };

    // Al volver desde una ficha la URL trae #card-<key>: una vez pintado el listado se
    // centra esa card en pantalla.
    useEffect(() => {
        const hash = window.location.hash;
        if (!hash.startsWith('#card-')) return undefined;
        // El pequeño delay deja que Inertia termine su propio reseteo de scroll al navegar.
        const timerId = window.setTimeout(() => {
            document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'center' });
        }, 100);
        return () => window.clearTimeout(timerId);
    }, []);

    const loadMore = () => {
        if (loadingMore || !hasMore) return;
        const params = currentQuery();
        params.page = Math.ceil(items.length / TIENDA_PAGE_SIZE) + 1;
        router.get(route('tienda.index'), params, {
            preserveState: true,
            preserveScroll: true,
            preserveUrl: true,
            only: ['productos'],
            onStart: () => setLoadingMore(true),
            onFinish: () => setLoadingMore(false),
        });
    };

    const applySheetFilters = ({ filter, categoria, subcategoria }) => {
        setSheetOpen(false);
        navigate({ filter, categoria, subcategoria, q: filters.q });
    };

    // Búsqueda mientras se escribe: espera a que el usuario deje de teclear, no consulta
    // con 1 sola letra y recarga solo lo necesario (productos + filtros) sin mover el
    // scroll ni cerrar el teclado en mobile. Inertia cancela la visita anterior si llega
    // una nueva, así que nunca se acumulan consultas en vuelo.
    const runSearch = (term) => {
        const params = {
            filter: activeFilter,
            categoria: activeCategoriaId,
            subcategoria: activeSubcategoriaId,
            q: term,
        };
        const clean = Object.fromEntries(
            Object.entries(params).filter(([, value]) => value != null && value !== '' && value !== 'todos')
        );
        router.get(route('tienda.index'), clean, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['productos', 'filters'],
            onStart: () => setSearching(true),
            onFinish: () => setSearching(false),
        });
    };

    useEffect(() => {
        const trimmed = searchTerm.trim();
        if (trimmed === (filters.q || '')) return undefined;
        // Con menos de SEARCH_MIN_CHARS no se busca, salvo para limpiar una búsqueda previa.
        if (trimmed !== '' && trimmed.length < SEARCH_MIN_CHARS) return undefined;

        const timeoutId = setTimeout(() => runSearch(trimmed), SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    // Enter en el teclado de mobile: busca al instante y baja el teclado para ver resultados.
    const handleSearchSubmit = (event) => {
        event.preventDefault();
        const trimmed = searchTerm.trim();
        searchInputRef.current?.blur();
        if (trimmed !== (filters.q || '')) runSearch(trimmed);
    };

    const getQty = (id) => quantities[id] ?? 1;
    const setQty = (id, value) =>
        setQuantities((previous) => ({ ...previous, [id]: Math.max(1, value) }));

    const addToCart = (producto) => {
        const qty = getQty(producto.id);
        // El quick-add solo llega acá cuando !producto.tiene_variantes (ver ProductCard):
        // para un combo eso significa que ningún item exige elegir color, así que se
        // agrega sin selecciones — igual que un producto sin variantes.
        if (producto.tipo === 'combo') {
            addComboToCartContext(producto, qty, []);
        } else {
            addToCartContext(producto, qty);
        }
        if (toast) clearTimeout(window._toastTimer);
        setToast(`${producto.titulo} agregado al carrito`);
        window._toastTimer = setTimeout(() => setToast(null), 2500);
    };

    return (
        <div className="min-h-screen bg-[#fcf9f8] text-[#1c1b1b] antialiased">
            <Head title="Catálogo" />
            <LandingHeader canLogin={canLogin} />

            <main className="w-full pb-6">
                <section className="relative isolate overflow-hidden border-b border-[#6000ca]/10 bg-[#1c1b1b]">
                    {/* Banner de fondo: una imagen para mobile (vertical) y otra para desktop. El degradado
                        oscuro asegura que el título se lea sobre la foto, que es muy cargada. */}
                    <picture className="absolute inset-0 -z-10">
                        <source media="(max-width: 767px)" srcSet="/images/banner-catalogo-mobile.png" />
                        <img
                            src="/images/banner-catalogo-desktop.png"
                            alt=""
                            aria-hidden="true"
                            className="h-full w-full object-cover object-center"
                            fetchpriority="high"
                            draggable={false}
                        />
                    </picture>
                    <div
                        className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/60 to-black/40 md:bg-gradient-to-r md:from-black/85 md:via-black/55 md:to-black/15"
                        aria-hidden="true"
                    />

                    <div className="flex min-h-[340px] flex-col justify-end px-3 py-9 sm:px-4 md:min-h-[380px] md:py-11 xl:py-12">
                        <div className="max-w-4xl">
                            <h1 className="text-[clamp(2.35rem,6.5vw,4.75rem)] font-black uppercase leading-[0.94] tracking-tight text-white">
                                Catálogo de <span className="text-[#8f32ff] [text-shadow:0_2px_28px_rgba(143,50,255,0.6)]">productos</span>
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/85 md:text-base lg:text-lg">
                                Explorá nuestra selección de efectos especiales y encontrá lo que necesitás para transformar tu evento.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="px-3 py-5 sm:px-4 md:py-6">
                    <div className="overflow-hidden rounded-[1.5rem] border border-black/[0.06] bg-white shadow-[0_14px_34px_-28px_rgba(28,27,27,0.45)]">
                        <div className="border-b border-black/[0.06] p-3 md:p-4">
                            <label htmlFor="tienda-search" className="sr-only">
                                Buscar productos
                            </label>
                            <form onSubmit={handleSearchSubmit} role="search" className="flex items-center gap-2">
                            <div className="relative min-w-0 flex-1">
                                <svg
                                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6000ca]/50"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    aria-hidden="true"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.85-5.4a7.25 7.25 0 11-14.5 0 7.25 7.25 0 0114.5 0z" />
                                </svg>
                                <input
                                    id="tienda-search"
                                    ref={searchInputRef}
                                    type="search"
                                    inputMode="search"
                                    enterKeyHint="search"
                                    autoComplete="off"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Buscar productos…"
                                    // text-base en mobile evita el zoom automático de iOS al enfocar el input.
                                    className="w-full rounded-full border border-black/[0.08] bg-[#fcf9f8] py-3 pl-11 pr-11 text-base font-medium text-[#1c1b1b] placeholder:text-[#81788a] transition-all focus:border-[#6000ca]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6000ca]/20 md:text-sm [&::-webkit-search-cancel-button]:appearance-none"
                                />
                                {searching ? (
                                    <span
                                        className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-[#6000ca]/25 border-t-[#6000ca]"
                                        role="status"
                                        aria-label="Buscando"
                                    />
                                ) : (
                                    searchTerm && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchTerm('');
                                                searchInputRef.current?.focus();
                                            }}
                                            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#81788a] transition-colors hover:bg-black/5 hover:text-[#1c1b1b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca]"
                                            aria-label="Limpiar búsqueda"
                                        >
                                            <CloseIcon />
                                        </button>
                                    )
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setSheetOpen(true)}
                                className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#6000ca]/10 text-[#6000ca] transition-all active:scale-95 md:hidden"
                                aria-label={activeFiltersCount > 0 ? `Abrir filtros (${activeFiltersCount} aplicados)` : 'Abrir filtros'}
                            >
                                <FilterIcon className="h-5 w-5" />
                                {activeFiltersCount > 0 && (
                                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#6000ca] px-1 text-[10px] font-black text-white ring-2 ring-white">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </button>
                            </form>

                            {activeFiltersCount > 0 && (
                                <div className="mt-3 flex flex-wrap items-center gap-2 md:hidden">
                                    {appliedLabels.map((label) => (
                                        <span
                                            key={label}
                                            className="rounded-full border border-[#6000ca]/20 bg-[#6000ca]/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#6000ca]"
                                        >
                                            {label}
                                        </span>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => navigate({ q: filters.q })}
                                        className="px-1 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#4b4356] underline underline-offset-2 active:opacity-60"
                                    >
                                        Limpiar filtros
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="hidden min-w-0 items-center gap-3 p-4 md:flex">
                            <span className="hidden h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#6000ca]/10 text-[#6000ca] sm:flex" aria-hidden="true">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10m-7 6h4" />
                                </svg>
                            </span>

                            <h2 className="flex-shrink-0 pt-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1c1b1b] md:pt-0">
                                Filtros
                            </h2>

                            <div className="min-w-0 flex-1 overflow-x-auto no-scrollbar">
                                <div className="flex w-max min-w-full items-center gap-2 lg:w-full lg:flex-wrap">
                                    {tipos.map(({ key, label }) => (
                                        <Chip
                                            key={key}
                                            active={activeFilter === key}
                                            onClick={() => handleSpecialFilter(key)}
                                        >
                                            {label}
                                        </Chip>
                                    ))}

                                    {categorias.length > 0 && (
                                        <span className="mx-1 h-6 w-px flex-shrink-0 bg-black/10" aria-hidden="true" />
                                    )}

                                    {categorias.map((category) => (
                                        <Chip
                                            key={category.id}
                                            active={activeCategoriaId === category.id}
                                            onClick={() => handleCategory(category.id)}
                                        >
                                            {category.nombre}
                                        </Chip>
                                    ))}

                                    <span className="w-1 flex-shrink-0" aria-hidden="true" />
                                </div>
                            </div>
                        </div>

                        {activeCat?.subcategorias?.length > 0 && (
                            <div className="hidden min-w-0 flex-row items-center gap-3 border-t border-black/[0.06] bg-[#fcf9f8] px-4 py-3 md:flex">
                                <span className="flex-shrink-0 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#4b4356]">
                                    {activeCat.nombre}
                                </span>
                                <div className="min-w-0 flex-1 overflow-x-auto no-scrollbar">
                                    <div className="flex w-max min-w-full gap-2 md:flex-wrap">
                                        {activeCat.subcategorias.map((subcategory) => (
                                            <Chip
                                                key={subcategory.id}
                                                active={activeSubcategoriaId === subcategory.id}
                                                onClick={() => handleSubcategory(subcategory.id)}
                                                sub
                                            >
                                                {subcategory.nombre}
                                            </Chip>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <section id="productos" className="scroll-mt-36 px-3 sm:px-4">
                    <div className="mb-3 flex items-center justify-between gap-4 border-b border-[#6000ca]/10 pb-3">
                        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1c1b1b]">
                            Resultados
                        </h2>
                        <p className="text-right text-xs font-semibold text-[#4b4356]">
                            <span className="font-black text-[#6000ca]">{productos.total}</span>{' '}
                            producto{productos.total !== 1 ? 's' : ''} encontrado{productos.total !== 1 ? 's' : ''}
                        </p>
                    </div>

                    {items.length === 0 ? (
                        <EmptyState onReset={() => navigate({})} />
                    ) : (
                        <div
                            className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5"
                            onClickCapture={rememberReturnPoint}
                        >
                            {items.map((producto) => (
                                <ProductCard
                                    key={producto.id}
                                    producto={producto}
                                    qty={getQty(producto.id)}
                                    onQtyChange={(value) => setQty(producto.id, value)}
                                    onAddToCart={() => addToCart(producto)}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {items.length > 0 && (
                    <div className="flex flex-col items-center gap-2 px-3 py-9 sm:px-4">
                        <p className="text-xs font-semibold text-[#4b4356]">
                            Mostrando {items.length} de {productos.total}
                        </p>
                        {hasMore && (
                            <button
                                type="button"
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="inline-flex items-center gap-2 rounded-full bg-[#6000ca] px-8 py-3.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white shadow-md shadow-[#6000ca]/20 transition-all hover:bg-[#4f00a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95 disabled:opacity-70"
                            >
                                {loadingMore && (
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
                                )}
                                {loadingMore ? 'Cargando…' : 'Cargar más productos'}
                            </button>
                        )}
                    </div>
                )}
            </main>

            <LandingFooter canLogin={canLogin} />

            <FiltersSheet
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                categorias={categorias}
                tipos={tipos}
                initial={{ filter: activeFilter, categoria: activeCategoriaId, subcategoria: activeSubcategoriaId }}
                onApply={applySheetFilters}
            />

            {toast && <CartToast message={toast} />}
        </div>
    );
}
