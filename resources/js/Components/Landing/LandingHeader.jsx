import { Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useCart } from '@/Context/CartContext';

const NAV_ITEMS = [
    {
        id: 'inicio',
        label: 'Inicio',
        href: '/',
        isRoute: false,
        match: (url) => url === '/',
        icon: (active) => (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        id: 'tienda',
        label: 'Tienda',
        href: 'tienda.index',
        isRoute: true,
        match: (url) => url.startsWith('/tienda'),
        icon: (active) => (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
        ),
    },
    {
        id: 'carrito',
        label: 'Carrito',
        href: 'carrito.index',
        isRoute: true,
        match: (url) => url.startsWith('/carrito'),
        icon: (active) => (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ),
    },
];

export default function LandingHeader({ canLogin }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const { cartCount } = useCart();
    const { url } = usePage();

    return (
        <>
            <header className="bg-white/90 backdrop-blur-xl sticky top-0 z-50 border-b border-gray-100 shadow-sm">
                <div className="flex justify-between items-center px-4 md:px-6 py-4 max-w-[1440px] mx-auto">
                    {/* Left: hamburger (mobile) + logo */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="md:hidden p-2 rounded-xl hover:bg-gray-50 transition-colors"
                            aria-label="Menú"
                        >
                            <svg className="w-6 h-6 text-[#6000ca]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                {menuOpen
                                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                }
                            </svg>
                        </button>
                        <Link href="/" className="text-2xl font-black text-[#6000ca] tracking-tight select-none">
                            Chisperío
                        </Link>
                    </div>

                    {/* Center: desktop nav */}
                    <nav className="hidden md:flex items-center gap-6">
                        <Link href="/" className={`font-semibold text-sm transition-colors ${url === '/' ? 'text-[#6000ca]' : 'text-gray-500 hover:text-[#6000ca]'}`}>
                            Inicio
                        </Link>
                        <Link href={route('tienda.index')} className={`font-semibold text-sm transition-colors ${url.startsWith('/tienda') ? 'text-[#6000ca]' : 'text-gray-500 hover:text-[#6000ca]'}`}>
                            Tienda
                        </Link>
                    </nav>

                    {/* Right: cart icon + auth */}
                    <div className="flex items-center gap-1">
                        <Link
                            href={route('carrito.index')}
                            className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors"
                            aria-label="Carrito de compras"
                        >
                            <svg className="w-6 h-6 text-[#6000ca]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {cartCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 bg-[#FF00D4] text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center leading-none">
                                    {cartCount > 99 ? '99+' : cartCount}
                                </span>
                            )}
                        </Link>
                        {canLogin && (
                            <Link
                                href={route('login')}
                                className="hidden md:inline-flex items-center px-4 py-2 text-sm font-semibold text-[#6000ca] rounded-xl hover:bg-purple-50 transition-colors"
                            >
                                Ingresar
                            </Link>
                        )}
                    </div>
                </div>

                {/* Mobile dropdown */}
                {menuOpen && (
                    <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-1">
                        <Link href="/" onClick={() => setMenuOpen(false)} className="font-semibold text-sm text-gray-700 py-2.5 hover:text-[#6000ca] transition-colors">
                            Inicio
                        </Link>
                        <Link href={route('tienda.index')} onClick={() => setMenuOpen(false)} className="font-semibold text-sm text-gray-700 py-2.5 hover:text-[#6000ca] transition-colors">
                            Tienda
                        </Link>
                        <Link href={route('carrito.index')} onClick={() => setMenuOpen(false)} className="font-semibold text-sm text-gray-700 py-2.5 hover:text-[#6000ca] transition-colors flex items-center gap-2">
                            Carrito
                            {cartCount > 0 && (
                                <span className="bg-[#FF00D4] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                        {canLogin && (
                            <Link href={route('login')} className="font-semibold text-sm text-[#6000ca] py-2.5">
                                Ingresar
                            </Link>
                        )}
                    </div>
                )}
            </header>

            {/* Mobile bottom nav */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-stretch bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-50">
                {NAV_ITEMS.map((item) => {
                    const isActive = item.match(url);
                    const href = item.isRoute ? route(item.href) : item.href;
                    const cls = `flex flex-col items-center justify-center pt-2 pb-3 flex-1 transition-all ${
                        isActive
                            ? 'text-[#FF00D4] border-t-2 border-[#FF00D4]'
                            : 'text-gray-400 hover:text-[#6000ca] border-t-2 border-transparent'
                    }`;

                    const content = (
                        <>
                            <span className="relative">
                                {item.icon(isActive)}
                                {item.id === 'carrito' && cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1.5 bg-[#FF00D4] text-white text-[8px] font-bold min-w-[14px] h-[14px] px-0.5 rounded-full flex items-center justify-center leading-none">
                                        {cartCount > 9 ? '9+' : cartCount}
                                    </span>
                                )}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5">{item.label}</span>
                        </>
                    );

                    return item.isRoute ? (
                        <Link key={item.id} href={href} className={cls}>{content}</Link>
                    ) : (
                        <a key={item.id} href={href} className={cls}>{content}</a>
                    );
                })}
            </nav>

            {/* Spacer so content isn't hidden behind mobile nav */}
            <div className="md:hidden h-20" />
        </>
    );
}
