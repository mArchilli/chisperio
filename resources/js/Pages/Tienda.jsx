import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import LandingHeader from '@/Components/Landing/LandingHeader';
import LandingFooter from '@/Components/Landing/LandingFooter';
import { useCart } from '@/Context/CartContext';
import { resolverPrecio } from '@/lib/pricing';

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
            className="h-full w-full object-contain p-4 mix-blend-multiply transition-transform duration-500 group-hover:scale-[1.04] md:p-5"
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
    const discount = hasOffer ? Math.round(precioInfo.ahorroTotalPorcentaje) : null;

    return (
        <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[1.5rem] border border-black/[0.06] bg-white shadow-[0_14px_34px_-26px_rgba(28,27,27,0.55)] transition-all duration-300 hover:-translate-y-1 hover:border-[#6000ca]/20 hover:shadow-[0_24px_45px_-25px_rgba(96,0,202,0.45)]">
            <Link
                href={route('tienda.show', producto.id)}
                className="relative block aspect-[4/3] overflow-hidden bg-[#f6f3f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6000ca]"
                aria-label={`Ver ${producto.titulo}`}
            >
                {!hasOffer && producto.is_featured && (
                    <span
                        className="absolute left-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center text-[#6000ca] drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]"
                        aria-label="Producto destacado"
                    >
                        <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.07 3.29a1 1 0 00.95.69h3.46c.97 0 1.37 1.24.59 1.81l-2.8 2.03a1 1 0 00-.36 1.12l1.07 3.29c.3.92-.76 1.69-1.54 1.12l-2.8-2.03a1 1 0 00-1.18 0l-2.8 2.03c-.78.57-1.84-.2-1.54-1.12l1.07-3.29a1 1 0 00-.36-1.12l-2.8-2.03c-.78-.57-.38-1.81.59-1.81h3.46a1 1 0 00.95-.69l1.07-3.29z" />
                        </svg>
                    </span>
                )}

                {hasOffer && (
                    <span className="absolute right-3 top-3 z-10 rounded-full bg-[#FF00D4] px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-white shadow-lg shadow-pink-500/20">
                        {discount}% off
                    </span>
                )}

                <ProductImage producto={producto} />
            </Link>

            <div className="flex min-w-0 flex-1 flex-col p-3.5 xl:p-4">
                <p className="mb-2 min-h-4 truncate text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#6000ca] xl:text-[10px]">
                    {producto.categorias?.[0]?.nombre ?? 'Selección Chisperío'}
                </p>

                <Link
                    href={route('tienda.show', producto.id)}
                    className="line-clamp-2 min-h-10 text-sm font-extrabold leading-snug text-[#1c1b1b] transition-colors hover:text-[#6000ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 xl:text-[15px]"
                >
                    {producto.titulo}
                </Link>

                <div className="mt-auto border-t border-black/[0.06] pt-3.5">
                    {hasOffer && (
                        <span className="block text-[10px] font-medium leading-none text-[#81788a] line-through">
                            {formatPrice(producto.precio)}
                        </span>
                    )}
                    <span className={`block whitespace-nowrap text-lg font-black leading-none text-[#6000ca] ${hasOffer ? 'mt-1.5' : ''}`}>
                        {formatPrice(displayPrice)}
                    </span>
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
                            onClick={() => onQtyChange(qty + 1)}
                            className="flex h-full items-center justify-center text-base font-bold leading-none text-[#6000ca] transition-colors hover:bg-[#6000ca] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6000ca]"
                            aria-label="Aumentar cantidad"
                        >
                            +
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onAddToCart}
                        className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-full bg-[#6000ca] px-3 text-[10px] font-extrabold uppercase tracking-[0.05em] text-white shadow-md shadow-[#6000ca]/20 transition-all hover:bg-[#4f00a8] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95"
                        aria-label={`Agregar ${producto.titulo} al carrito`}
                    >
                        <BagIcon className="h-4 w-4 flex-shrink-0" />
                        <span className="hidden truncate sm:inline">Agregar</span>
                    </button>
                </div>

                <Link
                    href={route('tienda.show', producto.id)}
                    className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-full border border-[#6000ca]/25 bg-white px-3 text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#6000ca] transition-all hover:border-[#6000ca] hover:bg-[#6000ca] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95"
                >
                    Ver producto
                </Link>
            </div>
        </article>
    );
}

function Pagination({ currentPage, lastPage, onPageChange }) {
    if (lastPage <= 1) return null;

    const pages = [];
    let prev = null;
    for (let i = 1; i <= lastPage; i++) {
        if (i === 1 || i === lastPage || (i >= currentPage - 1 && i <= currentPage + 1)) {
            if (prev !== null && i - prev > 1) pages.push('…');
            pages.push(i);
            prev = i;
        }
    }

    const buttonBase = 'flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95';
    const arrowClasses = `${buttonBase} border border-[#6000ca]/20 bg-white text-[#6000ca] shadow-sm hover:border-[#6000ca] hover:bg-[#6000ca] hover:text-white disabled:pointer-events-none disabled:opacity-30`;

    return (
        <nav className="flex items-center justify-center gap-1.5 px-3 py-9 sm:px-4" aria-label="Paginación">
            <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                className={arrowClasses}
                aria-label="Anterior"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            {pages.map((page, index) =>
                page === '…' ? (
                    <span key={`dot-${index}`} className="px-1 text-sm text-[#81788a] select-none">…</span>
                ) : (
                    <button
                        type="button"
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`${buttonBase} ${
                            page === currentPage
                                ? 'bg-[#6000ca] text-white shadow-md shadow-[#6000ca]/20'
                                : 'border border-black/[0.08] bg-white text-[#4b4356] hover:border-[#6000ca] hover:text-[#6000ca]'
                        }`}
                        aria-label={`Ir a la página ${page}`}
                        aria-current={page === currentPage ? 'page' : undefined}
                    >
                        {page}
                    </button>
                )
            )}

            <button
                type="button"
                disabled={currentPage === lastPage}
                onClick={() => onPageChange(currentPage + 1)}
                className={arrowClasses}
                aria-label="Siguiente"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
            </button>
        </nav>
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

export default function Tienda({ productos, categorias, filters, canLogin }) {
    const [quantities, setQuantities] = useState({});
    const [toast, setToast] = useState(null);
    const { addToCart: addToCartContext } = useCart();

    const activeFilter = filters.filter || 'todos';
    const activeCategoriaId = filters.categoria ? Number(filters.categoria) : null;
    const activeSubcategoriaId = filters.subcategoria ? Number(filters.subcategoria) : null;
    const activeCat = categorias.find((category) => category.id === activeCategoriaId) ?? null;

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
        });

    const handleCategory = (categoryId) =>
        navigate({
            filter: activeFilter,
            categoria: activeCategoriaId === categoryId ? null : categoryId,
        });

    const handleSubcategory = (subcategoryId) =>
        navigate({
            filter: activeFilter,
            categoria: activeCategoriaId,
            subcategoria: activeSubcategoriaId === subcategoryId ? null : subcategoryId,
        });

    const handlePageChange = (page) => {
        const params = {};
        if (filters.filter && filters.filter !== 'todos') params.filter = filters.filter;
        if (filters.categoria) params.categoria = filters.categoria;
        if (filters.subcategoria) params.subcategoria = filters.subcategoria;
        params.page = page;
        router.get(route('tienda.index'), params, { preserveScroll: false });
    };

    const getQty = (id) => quantities[id] ?? 1;
    const setQty = (id, value) =>
        setQuantities((previous) => ({ ...previous, [id]: Math.max(1, value) }));

    const addToCart = (producto) => {
        const qty = getQty(producto.id);
        addToCartContext(producto, qty);
        if (toast) clearTimeout(window._toastTimer);
        setToast(`${producto.titulo} agregado al carrito`);
        window._toastTimer = setTimeout(() => setToast(null), 2500);
    };

    return (
        <div className="min-h-screen bg-[#fcf9f8] text-[#1c1b1b] antialiased">
            <Head title="Catálogo — Chisperío" />
            <LandingHeader canLogin={canLogin} />

            <main className="w-full pb-6">
                <section className="border-b border-[#6000ca]/10 bg-[#f7f6fb]">
                    <div className="flex flex-col gap-7 px-3 py-9 sm:px-4 md:flex-row md:items-end md:justify-between md:py-11 xl:py-12">
                        <div className="max-w-4xl">
                            <h1 className="text-[clamp(2.35rem,6.5vw,4.75rem)] font-black uppercase leading-[0.94] tracking-tight text-[#1c1b1b]">
                                Catálogo de <span className="text-[#6000ca]">productos</span>
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#4b4356] md:text-base lg:text-lg">
                                Explorá nuestra selección de efectos especiales y encontrá lo que necesitás para transformar tu evento.
                            </p>
                        </div>

                        <div className="flex w-fit max-w-full items-center gap-3 rounded-[1.35rem] border border-[#6000ca]/10 bg-white px-4 py-3.5 shadow-[0_14px_34px_-28px_rgba(28,27,27,0.45)] md:flex-shrink-0 md:px-5 md:py-4">
                            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#6000ca] text-white">
                                <BagIcon className="h-5 w-5" />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#6000ca]">
                                    Compra online
                                </span>
                                <span className="mt-0.5 block text-xs font-bold text-[#1c1b1b] md:text-sm">
                                    Elegí, ajustá la cantidad y sumá al carrito
                                </span>
                            </span>
                        </div>
                    </div>
                </section>

                <section className="px-3 py-5 sm:px-4 md:py-6">
                    <div className="overflow-hidden rounded-[1.5rem] border border-black/[0.06] bg-white shadow-[0_14px_34px_-28px_rgba(28,27,27,0.45)]">
                        <div className="flex min-w-0 items-start gap-3 p-3 md:items-center md:p-4">
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
                                    {[
                                        { key: 'todos', label: 'Todos' },
                                        { key: 'destacados', label: 'Destacados' },
                                        { key: 'ofertas', label: 'Ofertas' },
                                    ].map(({ key, label }) => (
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
                            <div className="flex min-w-0 flex-col gap-2 border-t border-black/[0.06] bg-[#fcf9f8] px-4 py-3 md:flex-row md:items-center md:gap-3">
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

                    {productos.data.length === 0 ? (
                        <EmptyState onReset={() => navigate({})} />
                    ) : (
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                            {productos.data.map((producto) => (
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

                <Pagination
                    currentPage={productos.current_page}
                    lastPage={productos.last_page}
                    onPageChange={handlePageChange}
                />
            </main>

            <LandingFooter canLogin={canLogin} />

            {toast && <CartToast message={toast} />}
        </div>
    );
}
