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

function ArrowIcon({ className = 'h-4 w-4' }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.25}
            aria-hidden="true"
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
        </svg>
    );
}

function BagIcon({ className = 'h-5 w-5' }) {
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

function CartItem({ item, onUpdateQty, onRemove }) {
    const enElTope = item.stockDisponible !== null && item.cantidad >= item.stockDisponible;

    return (
        <article
            className={`group overflow-hidden rounded-[1.75rem] border p-3 shadow-[0_14px_34px_-26px_rgba(28,27,27,0.55)] transition-all duration-300 sm:p-4 md:rounded-[2rem] md:p-5 ${
                item.sinStock
                    ? 'border-red-200 bg-red-50/40'
                    : 'border-black/[0.06] bg-white hover:border-[#6000ca]/15 hover:shadow-[0_24px_45px_-28px_rgba(96,0,202,0.4)]'
            }`}
        >
            <div className="flex items-start gap-3.5 sm:gap-5">
                <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-[1.25rem] border border-black/[0.05] bg-[#f6f3f8] sm:h-32 sm:w-32 md:h-40 md:w-40 md:rounded-[1.5rem]">
                    <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full border-[18px] border-white/45" />
                    {item.imagen ? (
                        <img
                            src={`/${item.imagen}`}
                            alt={item.titulo}
                            className={`relative h-full w-full object-contain p-3 mix-blend-multiply transition-transform duration-500 group-hover:scale-[1.035] md:p-4 motion-reduce:transition-none ${item.sinStock ? 'opacity-50 grayscale' : ''}`}
                        />
                    ) : (
                        <div className="relative flex h-full w-full items-center justify-center">
                            <span className="flex h-16 w-16 select-none items-center justify-center rounded-full border border-[#6000ca]/10 bg-white/75 text-3xl font-black text-[#6000ca]/20 shadow-sm md:h-20 md:w-20 md:text-4xl">
                                {item.titulo?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                </div>

                <div className="min-w-0 flex-1 py-1">
                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="mb-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#6000ca] sm:text-[10px]">
                                Producto seleccionado
                            </p>
                            <h2 className="line-clamp-2 text-sm font-extrabold leading-snug text-[#1c1b1b] sm:text-lg md:text-xl">
                                {item.titulo}
                            </h2>
                            {item.sinStock ? (
                                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#ba1a1a] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white">
                                    Sin stock — no disponible
                                </p>
                            ) : (
                                <p className="mt-2 text-[11px] font-medium text-[#81788a] sm:text-xs">
                                    {formatPrice(item.precioUnitario)} por unidad
                                    {item.stockDisponible !== null && item.stockDisponible <= 3 && (
                                        <span className="ml-1.5 font-bold text-amber-600">
                                            · Quedan {item.stockDisponible}
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => onRemove(item.id)}
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-white text-[#81788a] transition-all hover:border-red-200 hover:bg-red-50 hover:text-[#ba1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-90"
                            aria-label={`Eliminar ${item.titulo} del carrito`}
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>

                    <div className="mt-4 hidden items-end justify-between gap-4 border-t border-black/[0.06] pt-4 sm:flex md:mt-6 md:pt-5">
                        <div>
                            <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#81788a]">
                                Cantidad
                            </p>
                            <div className="flex h-11 items-center rounded-full border border-black/[0.08] bg-[#f7f6f9] px-1">
                                <button
                                    type="button"
                                    onClick={() => onUpdateQty(item.id, item.cantidad - 1)}
                                    disabled={item.sinStock}
                                    className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold leading-none text-[#6000ca] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
                                    aria-label="Reducir cantidad"
                                >
                                    −
                                </button>
                                <span className="min-w-10 select-none text-center text-sm font-black text-[#1c1b1b]">
                                    {item.cantidad}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onUpdateQty(item.id, item.cantidad + 1)}
                                    disabled={item.sinStock || enElTope}
                                    title={enElTope ? `Solo quedan ${item.stockDisponible} disponibles` : undefined}
                                    className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold leading-none text-[#6000ca] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
                                    aria-label="Aumentar cantidad"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="mb-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#81788a]">
                                Total del producto
                            </p>
                            <p className="text-xl font-black leading-none tracking-tight text-[#6000ca] md:text-2xl">
                                {formatPrice(item.subtotalItem)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-black/[0.06] px-1 pt-3 sm:hidden">
                <div className="flex h-11 items-center rounded-full border border-black/[0.08] bg-[#f7f6f9] px-1">
                    <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, item.cantidad - 1)}
                        disabled={item.sinStock}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold leading-none text-[#6000ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Reducir cantidad"
                    >
                        −
                    </button>
                    <span className="min-w-8 select-none text-center text-sm font-black text-[#1c1b1b]">
                        {item.cantidad}
                    </span>
                    <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, item.cantidad + 1)}
                        disabled={item.sinStock || enElTope}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold leading-none text-[#6000ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Aumentar cantidad"
                    >
                        +
                    </button>
                </div>

                <div className="min-w-0 text-right">
                    <p className="text-[8px] font-extrabold uppercase tracking-[0.1em] text-[#81788a]">Total</p>
                    <p className="truncate text-base font-black leading-tight text-[#6000ca]">
                        {formatPrice(item.subtotalItem)}
                    </p>
                </div>
            </div>
        </article>
    );
}

function EmptyCart() {
    return (
        <section className="relative overflow-hidden rounded-[2rem] border border-black/[0.06] bg-white px-5 py-16 text-center shadow-[0_30px_70px_-48px_rgba(28,27,27,0.5)] sm:px-8 sm:py-20 md:rounded-[2.5rem] md:py-24">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border-[48px] border-[#6000ca]/[0.035]" />
            <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#FF00D4]/[0.035] blur-3xl" />

            <div className="relative mx-auto mb-7 flex h-28 w-28 items-center justify-center rounded-full border border-[#6000ca]/10 bg-[#f6f3f8] text-[#6000ca] shadow-[0_20px_45px_-28px_rgba(96,0,202,0.75)]">
                <BagIcon className="h-12 w-12" />
                <span className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#FF00D4] text-sm font-black text-white shadow-lg shadow-pink-500/25">
                    0
                </span>
            </div>

            <div className="relative mx-auto max-w-xl">
                <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#6000ca]">
                    Tu próxima experiencia empieza acá
                </p>
                <h2 className="text-[clamp(2rem,8vw,4rem)] font-black uppercase leading-[0.95] tracking-[-0.045em] text-[#1c1b1b]">
                    Tu carrito está <span className="text-[#6000ca]">vacío</span>
                </h2>
                <p className="mx-auto mt-5 max-w-md text-sm font-medium leading-relaxed text-[#4b4356] md:text-base">
                    Explorá nuestro catálogo y elegí los efectos que van a transformar tu próximo evento.
                </p>
                <Link
                    href={route('tienda.index')}
                    className="mt-8 inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-[#6000ca] px-7 text-xs font-extrabold uppercase tracking-[0.07em] text-white shadow-[0_14px_28px_-14px_rgba(96,0,202,0.85)] transition-all hover:-translate-y-0.5 hover:bg-[#4f00a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-4 active:scale-95 motion-reduce:transform-none"
                >
                    <BagIcon />
                    Ir al catálogo
                    <ArrowIcon />
                </Link>
            </div>
        </section>
    );
}

function OrderSummary({ subtotal, cartCount, hayItemsSinStock }) {
    return (
        <aside
            aria-labelledby="order-summary-title"
            className="relative overflow-hidden rounded-[2rem] border border-black/[0.06] bg-white p-5 shadow-[0_24px_55px_-38px_rgba(28,27,27,0.55)] sm:p-6 lg:p-7"
        >
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full border-[36px] border-[#6000ca]/[0.035]" />

            <div className="relative">
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#6000ca]">
                    Resumen
                </p>
                <h2 id="order-summary-title" className="text-2xl font-black leading-tight tracking-tight text-[#1c1b1b] lg:text-[2rem]">
                    Tu pedido
                </h2>

                <div className="mt-7 space-y-4 text-sm">
                    <div className="flex items-center justify-between gap-4">
                        <span className="font-medium text-[#81788a]">
                            Productos <span className="text-[#4b4356]">({cartCount})</span>
                        </span>
                        <span className="font-extrabold text-[#1c1b1b]">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                        <span className="font-medium text-[#81788a]">Envío</span>
                        <span className="max-w-[12rem] text-right text-xs font-extrabold leading-snug text-[#6000ca]">
                            A calcular al finalizar
                        </span>
                    </div>
                    <div className="hidden items-center justify-between gap-4 md:flex">
                        <span className="font-medium text-[#81788a]">Impuestos</span>
                        <span className="font-extrabold text-[#1c1b1b]">{formatPrice(0)}</span>
                    </div>
                </div>

                <div className="mt-6 rounded-[1.5rem] border border-[#6000ca]/10 bg-[#f7f4fa] p-5">
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#4b4356]">
                                Total estimado
                            </p>
                        </div>
                        <p className="text-[clamp(1.8rem,7vw,2.4rem)] font-black leading-none tracking-[-0.04em] text-[#6000ca]">
                            {formatPrice(subtotal)}
                        </p>
                    </div>
                </div>

                {hayItemsSinStock ? (
                    <>
                        <button
                            type="button"
                            disabled
                            className="mt-5 flex h-14 w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-full bg-black/10 px-5 text-xs font-extrabold uppercase tracking-[0.07em] text-[#81788a]"
                        >
                            Pasar al checkout
                        </button>
                        <p className="mt-2 text-center text-[11px] font-semibold text-[#ba1a1a]">
                            Quitá los productos sin stock para poder continuar.
                        </p>
                    </>
                ) : (
                    <Link
                        href={route('checkout.index')}
                        className="mt-5 flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-[#6000ca] px-5 text-xs font-extrabold uppercase tracking-[0.07em] text-white shadow-[0_14px_28px_-14px_rgba(96,0,202,0.85)] transition-all hover:bg-[#4f00a8] hover:shadow-[0_18px_34px_-15px_rgba(96,0,202,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transform-none"
                    >
                        Pasar al checkout
                        <ArrowIcon />
                    </Link>
                )}

                <Link
                    href={route('tienda.index')}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#6000ca] bg-white px-5 py-3 text-xs font-extrabold uppercase tracking-[0.07em] text-[#6000ca] transition-all hover:bg-[#6000ca] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-[0.98]"
                >
                    Seguir comprando
                </Link>

                <div className="mt-6 border-t border-black/[0.06] pt-5">
                    <p className="mb-3 text-center text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#81788a]">
                        Métodos de pago aceptados
                    </p>
                    <div className="flex justify-center gap-3 text-[#6000ca]">
                        <span className="flex h-10 w-12 items-center justify-center rounded-xl border border-[#6000ca]/10 bg-[#6000ca]/[0.05]">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                        </span>
                        <span className="flex h-10 w-12 items-center justify-center rounded-xl border border-[#6000ca]/10 bg-[#6000ca]/[0.05]">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </span>
                        <span className="flex h-10 w-12 items-center justify-center rounded-xl border border-[#6000ca]/10 bg-[#6000ca]/[0.05]">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    );
}

export default function Carrito({ canLogin }) {
    const { items, removeFromCart, updateQty, subtotal, cartCount, hayItemsSinStock } = useCart();

    return (
        <div className="min-h-screen overflow-hidden bg-[#fcf9f8] text-[#1c1b1b] antialiased">
            <Head title="Tu Carrito — Chisperío" />
            <LandingHeader canLogin={canLogin} />

            <main className="relative pb-28 md:pb-24">
                <div className="pointer-events-none absolute -left-52 top-16 h-[30rem] w-[30rem] rounded-full bg-[#6000ca]/[0.035] blur-3xl" />
                <div className="pointer-events-none absolute -right-40 top-[34rem] h-[26rem] w-[26rem] rounded-full bg-[#FF00D4]/[0.025] blur-3xl" />

                <div className="relative w-full px-3 pt-8 sm:px-4 md:pt-12">
                    <header className="mb-8 flex flex-col gap-6 md:mb-12 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <h1 className="text-[clamp(2.5rem,11vw,5.25rem)] font-black uppercase leading-[0.92] tracking-[-0.055em] text-[#1c1b1b]">
                                Tu <span className="text-[#6000ca]">carrito</span>
                            </h1>
                            <p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-[#4b4356] md:text-base">
                                Revisá tus productos y ajustá las cantidades antes de continuar con tu pedido.
                            </p>
                        </div>

                        {items.length > 0 && (
                            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                                <span className="inline-flex h-11 items-center gap-2 rounded-full border border-[#6000ca]/10 bg-white px-4 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#6000ca] shadow-sm">
                                    <BagIcon className="h-4 w-4" />
                                    {cartCount} {cartCount === 1 ? 'producto' : 'productos'}
                                </span>

                                <nav aria-label="Progreso de compra" className="hidden items-center rounded-full border border-black/[0.06] bg-white p-1.5 shadow-sm sm:flex">
                                    <span className="flex h-8 items-center rounded-full bg-[#6000ca] px-3 text-[9px] font-extrabold uppercase tracking-[0.08em] text-white">
                                        1. Carrito
                                    </span>
                                    <span className="px-3 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#81788a]">
                                        2. Datos
                                    </span>
                                    <span className="px-3 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#81788a]">
                                        3. Confirmación
                                    </span>
                                </nav>
                            </div>
                        )}
                    </header>

                    {items.length === 0 ? (
                        <EmptyCart />
                    ) : (
                        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8 xl:gap-10">
                            <section aria-label="Productos en el carrito" className="space-y-4 lg:col-span-8 md:space-y-5">
                                {items.map((item) => (
                                    <CartItem
                                        key={item.id}
                                        item={item}
                                        onUpdateQty={updateQty}
                                        onRemove={removeFromCart}
                                    />
                                ))}
                            </section>

                            <div className="lg:col-span-4">
                                <div className="lg:sticky lg:top-28">
                                    <OrderSummary subtotal={subtotal} cartCount={cartCount} hayItemsSinStock={hayItemsSinStock} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <LandingFooter />
        </div>
    );
}
