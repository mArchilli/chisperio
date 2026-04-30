import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import LandingHeader from '@/Components/Landing/LandingHeader';
import LandingFooter from '@/Components/Landing/LandingFooter';
import { useCart } from '@/Context/CartContext';

const formatPrice = (price) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);

function ProductImage({ producto }) {
    if (producto.imagen_principal) {
        return (
            <img
                src={`/${producto.imagen_principal.ruta}`}
                alt={producto.titulo}
                className="w-full h-full object-contain mix-blend-multiply"
            />
        );
    }
    return (
        <span className="text-4xl font-black text-[#6000ca]/20 select-none">
            {producto.titulo?.charAt(0).toUpperCase()}
        </span>
    );
}

function Chip({ active, onClick, children, sub = false }) {
    if (sub) {
        return (
            <button
                onClick={onClick}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                    active
                        ? 'bg-[#6000ca]/10 text-[#6000ca] border-[#6000ca]/30'
                        : 'bg-white border-gray-200 text-[#4b4356] hover:border-[#6000ca]/40'
                }`}
            >
                {children}
            </button>
        );
    }
    return (
        <button
            onClick={onClick}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-95 ${
                active
                    ? 'bg-[#7d12ff] text-white shadow-md shadow-purple-500/25'
                    : 'bg-white border border-gray-200 text-[#4b4356] hover:border-[#6000ca]/40'
            }`}
        >
            {children}
        </button>
    );
}

function ProductCard({ producto, qty, onQtyChange, onAddToCart }) {
    const hasOffer = !!producto.oferta_vigente;
    const displayPrice = hasOffer ? producto.oferta_vigente.precio_oferta : producto.precio;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
            {/* Image */}
            <div className="relative aspect-square bg-[#f6f3f2] flex items-center justify-center p-3 md:p-4">
                {hasOffer && (
                    <span className="absolute top-2 left-2 bg-[#FF00D4] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider z-10">
                        {Math.round(producto.oferta_vigente.porcentaje_descuento)}% OFF
                    </span>
                )}
                {!hasOffer && producto.is_featured && (
                    <span className="absolute top-2 left-2 bg-cyan-100 text-cyan-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider z-10">
                        Destacado
                    </span>
                )}
                <ProductImage producto={producto} />
            </div>

            {/* Content */}
            <div className="p-3 flex flex-col flex-1">
                <p className="font-bold text-[13px] md:text-sm text-[#1c1b1b] line-clamp-2 leading-tight mb-1 flex-1">
                    {producto.titulo}
                </p>

                {producto.categorias?.[0] && (
                    <p className="text-[11px] text-[#4b4356] mb-2 truncate">
                        {producto.categorias[0].nombre}
                    </p>
                )}

                {/* Price */}
                <div className="mb-2.5">
                    {hasOffer && (
                        <span className="text-[11px] text-gray-400 line-through block leading-none">
                            {formatPrice(producto.precio)}
                        </span>
                    )}
                    <span className="text-base md:text-lg font-black text-[#6000ca] leading-tight">
                        {formatPrice(displayPrice)}
                    </span>
                </div>

                {/* Qty + Add */}
                <div className="flex items-center gap-1.5 mb-2">
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        <button
                            onClick={() => onQtyChange(qty - 1)}
                            className="w-7 h-7 flex items-center justify-center text-[#6000ca] hover:bg-purple-50 transition-colors font-bold text-base leading-none"
                            aria-label="Reducir cantidad"
                        >
                            −
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-[#1c1b1b] select-none">
                            {qty}
                        </span>
                        <button
                            onClick={() => onQtyChange(qty + 1)}
                            className="w-7 h-7 flex items-center justify-center text-[#6000ca] hover:bg-purple-50 transition-colors font-bold text-base leading-none"
                            aria-label="Aumentar cantidad"
                        >
                            +
                        </button>
                    </div>
                    <button
                        onClick={onAddToCart}
                        className="flex-1 h-7 bg-[#FF00D4] text-white rounded-lg flex items-center justify-center gap-1.5 hover:bg-[#d900b3] active:scale-95 transition-all shadow-sm text-xs font-bold"
                    >
                        <span className="inline">Agregar</span>
                    </button>
                </div>
                <Link
                    href={route('tienda.show', producto.id)}
                    className="w-full h-7 border border-[#6000ca] text-[#6000ca] rounded-lg flex items-center justify-center text-xs font-bold hover:bg-purple-50 transition-colors active:scale-95"
                >
                    Ver Producto
                </Link>
            </div>
        </div>
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

    const btnBase = 'w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-all';

    return (
        <nav className="flex items-center justify-center gap-1.5 px-4 py-8" aria-label="Paginación">
            <button
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
                className={`${btnBase} border border-gray-200 text-[#4b4356] disabled:opacity-30 hover:border-[#6000ca] hover:text-[#6000ca]`}
                aria-label="Anterior"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            {pages.map((page, i) =>
                page === '…' ? (
                    <span key={`dot-${i}`} className="text-gray-400 text-sm px-1 select-none">…</span>
                ) : (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={`${btnBase} ${
                            page === currentPage
                                ? 'bg-[#7d12ff] text-white shadow-md shadow-purple-500/25'
                                : 'border border-gray-200 text-[#4b4356] hover:border-[#6000ca] hover:text-[#6000ca]'
                        }`}
                    >
                        {page}
                    </button>
                )
            )}

            <button
                disabled={currentPage === lastPage}
                onClick={() => onPageChange(currentPage + 1)}
                className={`${btnBase} border border-gray-200 text-[#4b4356] disabled:opacity-30 hover:border-[#6000ca] hover:text-[#6000ca]`}
                aria-label="Siguiente"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
            </button>
        </nav>
    );
}

function EmptyState({ onReset }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-[#6000ca]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <h3 className="font-bold text-[#1c1b1b] mb-1">Sin resultados</h3>
            <p className="text-sm text-[#4b4356] mb-5">No hay productos con los filtros seleccionados.</p>
            <button
                onClick={onReset}
                className="text-sm font-bold text-[#6000ca] hover:underline"
            >
                Ver todos los productos
            </button>
        </div>
    );
}

function CartToast({ message }) {
    return (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-[#1c1b1b] text-white text-xs md:text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl z-[100] flex items-center gap-2.5 whitespace-nowrap pointer-events-none">
            <svg className="w-4 h-4 text-[#FF00D4] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
    const activeCat = categorias.find((c) => c.id === activeCategoriaId) ?? null;

    const navigate = (params) => {
        const clean = Object.fromEntries(
            Object.entries(params).filter(([, v]) => v != null && v !== '' && v !== 'todos')
        );
        router.get(route('tienda.index'), clean, {
            preserveState: true,
            replace: true,
            preserveScroll: false,
        });
    };

    const handleSpecialFilter = (f) =>
        navigate({
            filter: f,
            categoria: activeCategoriaId,
            subcategoria: activeSubcategoriaId,
        });

    const handleCategory = (catId) =>
        navigate({
            filter: activeFilter,
            categoria: activeCategoriaId === catId ? null : catId,
        });

    const handleSubcategory = (subId) =>
        navigate({
            filter: activeFilter,
            categoria: activeCategoriaId,
            subcategoria: activeSubcategoriaId === subId ? null : subId,
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
    const setQty = (id, val) =>
        setQuantities((prev) => ({ ...prev, [id]: Math.max(1, val) }));

    const addToCart = (producto) => {
        const qty = getQty(producto.id);
        addToCartContext(producto, qty);
        if (toast) clearTimeout(window._toastTimer);
        setToast(`${producto.titulo} agregado al carrito`);
        window._toastTimer = setTimeout(() => setToast(null), 2500);
    };

    return (
        <div
            className="bg-[#fcf9f8] min-h-screen text-[#1c1b1b] antialiased"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
            <Head title="Catálogo — Chisperío" />
            <LandingHeader canLogin={canLogin} />

            <main className="max-w-[1440px] mx-auto pb-6">
                {/* Title */}
                <div className="px-4 pt-6 pb-4 md:px-6 md:pt-10 md:pb-6">
                    <h1 className="text-[26px] md:text-[40px] font-extrabold text-[#1c1b1b] leading-tight tracking-tight">
                        Catálogo de Productos
                    </h1>
                    <p className="text-sm md:text-lg text-[#4b4356] mt-1">
                        Explora nuestra selección premium de efectos especiales de alta tecnología.
                    </p>
                </div>

                {/* Filter chips */}
                <div className="overflow-x-auto no-scrollbar">
                    <div className="flex gap-2 px-4 md:px-6 pb-1 w-max min-w-full">
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
                            <div className="w-px bg-gray-200 mx-1 self-center h-5 flex-shrink-0" />
                        )}

                        {categorias.map((cat) => (
                            <Chip
                                key={cat.id}
                                active={activeCategoriaId === cat.id}
                                onClick={() => handleCategory(cat.id)}
                            >
                                {cat.nombre}
                            </Chip>
                        ))}

                        <div className="w-4 flex-shrink-0" />
                    </div>
                </div>

                {/* Subcategory chips */}
                {activeCat?.subcategorias?.length > 0 && (
                    <div className="overflow-x-auto no-scrollbar mt-2">
                        <div className="flex gap-2 px-4 md:px-6 pb-1 w-max min-w-full">
                            <span className="flex-shrink-0 text-[11px] font-semibold text-[#4b4356] self-center mr-1">
                                {activeCat.nombre}:
                            </span>
                            {activeCat.subcategorias.map((sub) => (
                                <Chip
                                    key={sub.id}
                                    active={activeSubcategoriaId === sub.id}
                                    onClick={() => handleSubcategory(sub.id)}
                                    sub
                                >
                                    {sub.nombre}
                                </Chip>
                            ))}
                            <div className="w-4 flex-shrink-0" />
                        </div>
                    </div>
                )}

                {/* Result count */}
                <p className="px-4 md:px-6 pt-3 pb-1 text-xs text-[#4b4356]">
                    {productos.total} producto{productos.total !== 1 ? 's' : ''} encontrado{productos.total !== 1 ? 's' : ''}
                </p>

                {/* Grid */}
                <div className="px-4 md:px-6 mt-2">
                    {productos.data.length === 0 ? (
                        <EmptyState onReset={() => navigate({})} />
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
                            {productos.data.map((producto) => (
                                <ProductCard
                                    key={producto.id}
                                    producto={producto}
                                    qty={getQty(producto.id)}
                                    onQtyChange={(val) => setQty(producto.id, val)}
                                    onAddToCart={() => addToCart(producto)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
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
