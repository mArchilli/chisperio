import { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '@/Context/CartContext';
import { useNotificacionEnvioGratis } from '@/hooks/useNotificacionEnvioGratis';
import { useScrolledPast } from '@/hooks/useScrolledPast';
import BarraEnvioGratis from '@/Components/BarraEnvioGratis';
import { GRADIENTE_PERSONALIZADO } from '@/Components/VarianteColorSwatches';

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

                {item.variante && (
                    <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-[#4b4356]">
                        <span
                            className="h-2.5 w-2.5 flex-shrink-0 rounded-full border border-black/10"
                            style={
                                item.colorPersonalizadoTexto
                                    ? { background: GRADIENTE_PERSONALIZADO }
                                    : { backgroundColor: item.variante.color_hex || '#e5e5e5' }
                            }
                            aria-hidden="true"
                        />
                        {item.colorPersonalizadoTexto || item.variante.nombre}
                    </span>
                )}

                {item.addons.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                        {item.addons.map((addon) => (
                            <li key={addon.addon_id} className="text-[10px] font-medium leading-snug text-[#7c7388]">
                                {addon.nombre}
                                {addon.texto_personalizado ? `: "${addon.texto_personalizado}"` : ''}
                                {' — +'}{formatPrice(addon.precio)}
                            </li>
                        ))}
                    </ul>
                )}

                <p className="text-xs text-[#7c7388] mt-0.5">{formatPrice(item.precioUnitario)} c/u</p>

                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center bg-gray-100 rounded-full border border-gray-200 p-0.5">
                        <button
                            onClick={() => onUpdateQty(item.lineKey, item.cantidad - 1)}
                            className="w-6 h-6 flex items-center justify-center rounded-full text-[#6000ca] hover:bg-white transition-colors font-bold text-base leading-none active:scale-90"
                            aria-label="Reducir cantidad"
                        >
                            −
                        </button>
                        <span className="px-2 text-xs font-bold text-[#1c1b1b] min-w-[1.5rem] text-center select-none">
                            {item.cantidad}
                        </span>
                        <button
                            onClick={() => onUpdateQty(item.lineKey, item.cantidad + 1)}
                            className="w-6 h-6 flex items-center justify-center rounded-full text-[#6000ca] hover:bg-white transition-colors font-bold text-base leading-none active:scale-90"
                            aria-label="Aumentar cantidad"
                        >
                            +
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-[#6000ca]">
                            {formatPrice(item.subtotalItem)}
                        </span>
                        <button
                            onClick={() => onRemove(item.lineKey)}
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
    const { items, removeFromCart, updateQty, cartCount, subtotal, cartDrawerOpen, closeCartDrawer, toggleCartDrawer } = useCart();
    const { configuracionEnvio } = usePage().props;
    // En mobile el botón flotante queda oculto (el ícono del navbar dispara este mismo
    // drawer — ver LandingHeader) y en desktop no aparece hasta que el usuario scrollea
    // un poco, para no taparle el hero apenas entra al sitio.
    const scrolled = useScrolledPast();

    useNotificacionEnvioGratis(subtotal, configuracionEnvio?.montoMinimo, () => {
        toast.success('¡Desbloqueaste envío gratis! 🎉');
    });

    useEffect(() => {
        return router.on('navigate', (event) => {
            setPageVisible(shouldShow(new URL(event.detail.page.url, window.location.origin).pathname));
            closeCartDrawer();
        });
    }, [closeCartDrawer]);

    // Cerrar con Escape
    useEffect(() => {
        if (!cartDrawerOpen) return;
        function handler(e) {
            if (e.key === 'Escape') closeCartDrawer();
        }
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [cartDrawerOpen, closeCartDrawer]);

    // Bloquear el scroll del body mientras el drawer está abierto
    useEffect(() => {
        if (!cartDrawerOpen) return;
        const original = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = original;
        };
    }, [cartDrawerOpen]);

    if (!pageVisible) return null;

    return (
        <>
            {/* Overlay blureado: por encima del header (sticky z-50) y del menú mobile
                (z-[60]) para que abrir el carrito difumine realmente todo lo demás.
                Click afuera cierra el drawer. */}
            <div
                onClick={closeCartDrawer}
                aria-hidden="true"
                className={`fixed inset-0 z-[65] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
                    cartDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
            />

            {/* Drawer: alto completo, pegado a la derecha, ancho completo en mobile */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Tu carrito"
                className={`fixed inset-y-0 right-0 z-[70] flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[420px] ${
                    cartDrawerOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 flex-shrink-0">
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
                        onClick={closeCartDrawer}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        aria-label="Cerrar carrito"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Items */}
                {items.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
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
                    <div className="flex-1 overflow-y-auto px-2 py-1 divide-y divide-gray-50">
                        {items.map((item) => (
                            <MiniCartItem
                                key={item.lineKey}
                                item={item}
                                onUpdateQty={updateQty}
                                onRemove={removeFromCart}
                            />
                        ))}
                    </div>
                )}

                {/* Footer */}
                {items.length > 0 && (
                    <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/80 flex-shrink-0">
                        <div className="mb-3">
                            <BarraEnvioGratis subtotal={subtotal} />
                        </div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm text-[#7c7388]">Total</span>
                            <span className="font-black text-base text-[#6000ca]">{formatPrice(subtotal)}</span>
                        </div>
                        <Link
                            href={route('checkout.index')}
                            className="block w-full bg-[#6000ca] text-white text-sm font-bold py-3 rounded-xl text-center hover:bg-[#4f00a8] active:scale-95 transition-all shadow-sm shadow-[#6000ca]/20"
                            onClick={closeCartDrawer}
                        >
                            Finalizar Compra
                        </Link>
                        <Link
                            href={route('carrito.index')}
                            className="block w-full mt-2 border border-[#6000ca]/30 text-[#6000ca] text-sm font-semibold py-2.5 rounded-xl text-center hover:bg-purple-50 active:scale-95 transition-all"
                            onClick={closeCartDrawer}
                        >
                            Ver carrito completo
                        </Link>
                    </div>
                )}
            </div>

            {/* Botón flotante: solo desktop (en mobile el ícono del navbar abre este
                mismo drawer, ver LandingHeader) y recién visible tras scrollear un poco. */}
            <button
                onClick={toggleCartDrawer}
                aria-label={cartDrawerOpen ? 'Cerrar carrito' : 'Abrir carrito'}
                className={`fixed bottom-8 right-[6.5rem] z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-[#6000ca] shadow-[0_4px_24px_rgba(96,0,202,0.4)] transition-all duration-200 hover:scale-110 hover:bg-[#5000aa] active:scale-95 ${
                    scrolled ? 'md:flex' : 'md:hidden'
                }`}
            >
                <ShoppingCart className="h-7 w-7 text-white" strokeWidth={2.25} aria-hidden="true" />

                {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[#FF00D4] text-white text-[10px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center leading-none shadow-sm">
                        {cartCount > 99 ? '99+' : cartCount}
                    </span>
                )}
            </button>
        </>
    );
}
