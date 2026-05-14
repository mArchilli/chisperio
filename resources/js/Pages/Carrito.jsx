import { Head, Link } from '@inertiajs/react';
import { useCart } from '@/Context/CartContext';
import LandingHeader from '@/Components/Landing/LandingHeader';
import LandingFooter from '@/Components/Landing/LandingFooter';

const formatPrice = (price) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);

/* ─── Item card ─────────────────────────────────────────────────────────── */
function CartItem({ item, onUpdateQty, onRemove }) {
    return (
        <div className="
            flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 shadow-sm
            md:gap-6 md:p-6 md:border-[#e5e2e1] md:hover:shadow-lg
            transition-shadow duration-300
        ">
            {/* Imagen */}
            <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-slate-50 bg-[#f6f3f2] md:w-32 md:h-32">
                {item.imagen ? (
                    <img src={`/${item.imagen}`} alt={item.titulo} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl font-black text-[#6000ca]/20 select-none">
                            {item.titulo?.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
            </div>

            {/* Contenido */}
            <div className="flex-grow min-w-0">
                {/* Fila superior: título + trash */}
                <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-[#1c1b1b] leading-snug line-clamp-2 text-sm md:text-2xl md:font-[700]">
                            {item.titulo}
                        </h3>
                        <p className="text-[#7c7388] mt-0.5 text-xs md:text-base">
                            {formatPrice(item.precio_display)} c/u
                        </p>
                    </div>
                    <button
                        onClick={() => onRemove(item.id)}
                        className="flex-shrink-0 text-[#7c7388] hover:text-[#ba1a1a] transition-colors active:scale-90 p-1"
                        aria-label="Eliminar del carrito"
                    >
                        <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>

                {/* Fila inferior: stepper + precio */}
                <div className="flex items-center justify-between mt-3 md:mt-6">
                    {/* Stepper */}
                    <div className="flex items-center bg-[#f0eded] rounded-full border border-[#cdc2da] p-0.5 md:p-1">
                        <button
                            onClick={() => onUpdateQty(item.id, item.cantidad - 1)}
                            className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full text-[#6000ca] hover:bg-white transition-colors font-bold text-lg leading-none active:scale-90"
                            aria-label="Reducir cantidad"
                        >
                            −
                        </button>
                        <span className="px-3 md:px-4 font-bold text-sm md:font-[700] md:text-[14px] text-[#1c1b1b] select-none min-w-[2rem] text-center tracking-wider">
                            {item.cantidad}
                        </span>
                        <button
                            onClick={() => onUpdateQty(item.id, item.cantidad + 1)}
                            className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full text-[#6000ca] hover:bg-white transition-colors font-bold text-lg leading-none active:scale-90"
                            aria-label="Aumentar cantidad"
                        >
                            +
                        </button>
                    </div>

                    {/* Precio total del item */}
                    <span className="font-black text-[#6000ca] text-base md:text-[22px] leading-none">
                        {formatPrice(item.precio_display * item.cantidad)}
                    </span>
                </div>
            </div>
        </div>
    );
}

/* ─── Estado vacío ───────────────────────────────────────────────────────── */
function EmptyCart() {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
            <div className="w-24 h-24 rounded-full bg-purple-50 flex items-center justify-center mb-6">
                <svg className="w-12 h-12 text-[#6000ca]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            </div>
            <h2 className="text-2xl font-extrabold text-[#1c1b1b] mb-2">Tu carrito está vacío</h2>
            <p className="text-[#7c7388] mb-8 max-w-xs leading-relaxed">
                Explorá nuestro catálogo y agregá los productos que te interesan.
            </p>
            <Link
                href={route('tienda.index')}
                className="inline-flex items-center gap-2 bg-[#6000ca] text-white px-8 py-3.5 rounded-xl font-bold hover:bg-[#5000aa] active:scale-95 transition-all shadow-lg shadow-purple-500/25"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Ir al catálogo
            </Link>
        </div>
    );
}

/* ─── Sidebar resumen ────────────────────────────────────────────────────── */
function OrderSummary({ subtotal }) {
    return (
        <div className="bg-white border border-[#e5e2e1] rounded-xl p-6 md:p-8 shadow-sm">

            {/* Título */}
            <h2 className="font-bold text-xl md:text-[32px] md:font-[700] text-[#1c1b1b] leading-tight mb-6 md:mb-8">
                Resumen del pedido
            </h2>

            {/* Filas de costos */}
            <div className="space-y-4 mb-6 md:mb-8">
                {/* Subtotal */}
                <div className="flex justify-between items-center text-sm md:text-[18px]">
                    <span className="text-[#7c7388]">Subtotal</span>
                    <span className="font-semibold text-[#1c1b1b]">{formatPrice(subtotal)}</span>
                </div>

                {/* Envío */}
                <div className="flex justify-between items-center text-sm md:text-[18px]">
                    <span className="text-[#7c7388]">Envío</span>
                    <span className="font-semibold text-[#00515d]">A calcular al finalizar</span>
                </div>

                {/* Impuestos — solo desktop, igual al diseño */}
                <div className="hidden md:flex justify-between items-center text-[18px]">
                    <span className="text-[#7c7388]">Impuestos</span>
                    <span className="font-semibold text-[#1c1b1b]">{formatPrice(0)}</span>
                </div>

                {/* Separador + Total */}
                <div className="pt-4 border-t border-[#e5e2e1] flex justify-between items-center">
                    <span className="font-bold text-lg md:text-[24px] md:font-[700] text-[#1c1b1b]">Total</span>
                    <span className="font-black text-xl md:text-[22px] text-[#7d12ff]">
                        {formatPrice(subtotal)}
                    </span>
                </div>
            </div>

            {/* Trust badges */}
            <div className="mb-6 md:mb-8 space-y-3">
                <div className="flex items-center gap-3 text-xs md:text-sm text-[#7c7388]">
                    <svg className="w-5 h-5 text-[#ab008e] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Checkout seguro de Chisperío</span>
                </div>
                <div className="flex items-center gap-3 text-xs md:text-sm text-[#7c7388]">
                    <svg className="w-5 h-5 text-[#ab008e] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    <span>Manejo profesional e inclusión de seguro</span>
                </div>
            </div>

            {/* CTA principal */}
            <Link
                href={route('checkout.index')}
                className="w-full bg-[#d700b2] text-white font-bold py-4 md:py-5 rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-lg hover:bg-[#b5009a] text-sm md:text-base"
            >
                Finalizar Compra
            </Link>

            {/* CTA secundario */}
            <Link
                href={route('tienda.index')}
                className="mt-3 w-full border-2 border-[#6000ca] text-[#6000ca] font-bold py-3.5 md:py-4 rounded-xl flex items-center justify-center text-sm md:text-base active:scale-95 transition-all hover:bg-purple-50"
            >
                Seguir Comprando
            </Link>

            {/* Métodos de pago — solo desktop */}
            <div className="hidden md:block mt-8">
                <p className="text-xs text-[#7c7388] text-center mb-3">Métodos de pago aceptados</p>
                <div className="flex justify-center gap-4 opacity-50 hover:opacity-80 transition-opacity">
                    {/* Tarjeta de crédito */}
                    <svg className="w-7 h-7 text-[#4b4356]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    {/* Billetera */}
                    <svg className="w-7 h-7 text-[#4b4356]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {/* Transferencia */}
                    <svg className="w-7 h-7 text-[#4b4356]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                </div>
            </div>
        </div>
    );
}

/* ─── Página principal ───────────────────────────────────────────────────── */
export default function Carrito({ canLogin }) {
    const { items, removeFromCart, updateQty, subtotal, cartCount } = useCart();

    return (
        <div
            className="bg-white md:bg-[#fcf9f8] min-h-screen text-[#1c1b1b] antialiased"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
            <Head title="Tu Carrito — Chisperío" />
            <LandingHeader canLogin={canLogin} />

            <main className="max-w-[1280px] mx-auto px-4 md:px-8 pt-6 md:pt-12 pb-28 md:pb-24">

                {/* Encabezado de página */}
                <h1 className="text-2xl md:text-[48px] font-extrabold md:font-black text-[#1c1b1b] leading-tight tracking-tight mb-6 md:mb-12">
                    Tu Carrito
                </h1>

                {items.length === 0 ? (
                    <EmptyCart />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12">

                        {/* ── Columna izquierda: items ── */}
                        <div className="lg:col-span-8 space-y-4 md:space-y-8">
                            {items.map((item) => (
                                <CartItem
                                    key={item.id}
                                    item={item}
                                    onUpdateQty={updateQty}
                                    onRemove={removeFromCart}
                                />
                            ))}
                        </div>

                        {/* ── Columna derecha: resumen ── */}
                        <div className="lg:col-span-4">
                            <div className="lg:sticky lg:top-24">
                                <OrderSummary subtotal={subtotal} />
                            </div>
                        </div>

                    </div>
                )}
            </main>

            <LandingFooter />
        </div>
    );
}
