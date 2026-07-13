import { useEffect, useRef, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { useCart } from '@/Context/CartContext';

const EXCLUDED_PREFIXES = [
    '/carrito', '/checkout', '/login',
    '/forgot-password', '/reset-password', '/confirm-password',
    '/verify-email', '/dashboard', '/admin', '/profile',
];

function shouldShow(path) {
    return !EXCLUDED_PREFIXES.some((p) => path.startsWith(p));
}

const formatPrice = (n) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(n);

function MiniCartItem({ item, onUpdateQty, onRemove }) {
    return (
        <div className="flex gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors">
            <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-purple-50 border border-gray-100">
                {item.imagen ? (
                    <img src={`/${item.imagen}`} alt={item.titulo} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-lg font-black text-[#6000ca]/30 select-none">
                            {item.titulo?.[0]?.toUpperCase()}
                        </span>
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1c1b1b] leading-snug line-clamp-1">{item.titulo}</p>
                <p className="text-xs text-[#7c7388] mt-0.5">{formatPrice(item.precio_display)} c/u</p>

                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center bg-gray-100 rounded-full border border-gray-200 p-0.5">
                        <button
                            onClick={() => onUpdateQty(item.id, item.cantidad - 1)}
                            className="w-6 h-6 flex items-center justify-center rounded-full text-[#6000ca] hover:bg-white transition-colors font-bold text-base leading-none active:scale-90"
                            aria-label="Reducir cantidad"
                        >
                            −
                        </button>
                        <span className="px-2 text-xs font-bold text-[#1c1b1b] min-w-[1.5rem] text-center select-none">
                            {item.cantidad}
                        </span>
                        <button
                            onClick={() => onUpdateQty(item.id, item.cantidad + 1)}
                            className="w-6 h-6 flex items-center justify-center rounded-full text-[#6000ca] hover:bg-white transition-colors font-bold text-base leading-none active:scale-90"
                            aria-label="Aumentar cantidad"
                        >
                            +
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-[#6000ca]">
                            {formatPrice(item.precio_display * item.cantidad)}
                        </span>
                        <button
                            onClick={() => onRemove(item.id)}
                            className="text-gray-300 hover:text-red-400 transition-colors active:scale-90 p-0.5"
                            aria-label="Eliminar del carrito"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CartButton() {
    const [pageVisible, setPageVisible] = useState(() => shouldShow(window.location.pathname));
    const [open, setOpen] = useState(false);
    const { items, removeFromCart, updateQty, cartCount, subtotal } = useCart();
    const wrapperRef = useRef(null);

    useEffect(() => {
        return router.on('navigate', (event) => {
            setPageVisible(shouldShow(new URL(event.detail.page.url, window.location.origin).pathname));
            setOpen(false);
        });
    }, []);

    // Cerrar al hacer click fuera
    useEffect(() => {
        if (!open) return;
        function handler(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Cerrar con Escape
    useEffect(() => {
        if (!open) return;
        function handler(e) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open]);

    if (!pageVisible) return null;

    return (
        <div ref={wrapperRef} className="fixed bottom-24 md:bottom-8 right-20 md:right-[6.5rem] z-40">
            {/* Panel */}
            <div
                className={`
                    absolute bottom-[4.5rem] right-0
                    w-[min(340px,calc(100vw-2rem))]
                    bg-white rounded-2xl shadow-2xl border border-gray-100
                    overflow-hidden
                    transition-all duration-200 origin-bottom-right
                    ${open
                        ? 'opacity-100 scale-100 pointer-events-auto'
                        : 'opacity-0 scale-90 pointer-events-none'}
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#6000ca]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="font-bold text-[#1c1b1b]">Tu Carrito</span>
                        {cartCount > 0 && (
                            <span className="bg-purple-100 text-[#6000ca] text-xs font-bold px-2 py-0.5 rounded-full">
                                {cartCount} {cartCount === 1 ? 'item' : 'items'}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => setOpen(false)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        aria-label="Cerrar carrito"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Items */}
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                        <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mb-3">
                            <svg className="w-7 h-7 text-[#6000ca]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <p className="text-sm font-semibold text-[#1c1b1b]">Tu carrito está vacío</p>
                        <p className="text-xs text-[#7c7388] mt-1 leading-relaxed">
                            Explorá el catálogo y agregá productos
                        </p>
                    </div>
                ) : (
                    <div className="overflow-y-auto max-h-[50vh] px-1 py-1 divide-y divide-gray-50">
                        {items.map((item) => (
                            <MiniCartItem
                                key={item.id}
                                item={item}
                                onUpdateQty={updateQty}
                                onRemove={removeFromCart}
                            />
                        ))}
                    </div>
                )}

                {/* Footer */}
                {items.length > 0 && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/80">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm text-[#7c7388]">Total</span>
                            <span className="font-black text-base text-[#6000ca]">{formatPrice(subtotal)}</span>
                        </div>
                        <Link
                            href={route('checkout.index')}
                            className="block w-full bg-[#d700b2] text-white text-sm font-bold py-3 rounded-xl text-center hover:bg-[#b5009a] active:scale-95 transition-all shadow-sm"
                            onClick={() => setOpen(false)}
                        >
                            Finalizar Compra
                        </Link>
                        <Link
                            href={route('carrito.index')}
                            className="block w-full mt-2 border border-[#6000ca]/30 text-[#6000ca] text-sm font-semibold py-2.5 rounded-xl text-center hover:bg-purple-50 active:scale-95 transition-all"
                            onClick={() => setOpen(false)}
                        >
                            Ver carrito completo
                        </Link>
                    </div>
                )}
            </div>

            {/* Botón flotante */}
            <button
                onClick={() => setOpen((v) => !v)}
                aria-label="Abrir carrito"
                className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#6000ca] shadow-[0_4px_24px_rgba(96,0,202,0.4)] hover:bg-[#5000aa] hover:scale-110 active:scale-95 transition-all duration-200"
            >
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>

                {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[#FF00D4] text-white text-[10px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center leading-none shadow-sm">
                        {cartCount > 99 ? '99+' : cartCount}
                    </span>
                )}
            </button>
        </div>
    );
}
