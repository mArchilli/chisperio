import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/Context/CartContext';

const TOPBAR_MESSAGES = [
    {
        id: 'shipping',
        text: 'Envios a todo el pais - a domicilio',
        icon: (
            <svg className="h-3.5 w-3.5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 7.5A1.5 1.5 0 013 6h10.5A1.5 1.5 0 0115 7.5V15h1.379a1.5 1.5 0 011.06.44l1.62 1.62c.281.281.44.663.44 1.06V19.5a1.5 1.5 0 01-1.5 1.5H18" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5h2.625a1.5 1.5 0 011.2.6L21 14.25H15" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 19.5h1.5m0 0a2.25 2.25 0 104.5 0m-4.5 0a2.25 2.25 0 114.5 0m4.5 0h-4.5m4.5 0a2.25 2.25 0 104.5 0m-4.5 0a2.25 2.25 0 114.5 0" />
            </svg>
        ),
    },
    {
        id: 'payments',
        text: 'Todos los metodos de pago',
        icon: (
            <svg className="h-3.5 w-3.5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m3 0h2m-8 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
        ),
    },
    {
        id: 'rentals',
        text: 'Alquiler de maquinaria para eventos',
        icon: (
            <svg className="h-3.5 w-3.5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5v4.5l3 1.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    },
];

const NAV_LINKS = [
    {
        id: 'inicio',
        label: 'Inicio',
        href: '/',
        type: 'anchor',
        active: (url, hash) => url === '/' && (!hash || hash === '#inicio'),
    },
    {
        id: 'catalogo',
        label: 'Catalogo',
        href: 'tienda.index',
        type: 'route',
        active: (url) => url.startsWith('/tienda'),
    },
    {
        id: 'mayoristas',
        label: 'Mayoristas',
        href: 'mayoristas.index',
        type: 'route',
        active: (url) => url === '/mayoristas',
    },
    {
        id: 'contacto',
        label: 'Contacto',
        href: 'contacto.index',
        type: 'route',
        active: (url) => url === '/contacto',
    },
];

function Logo({ invert = false, className = '' }) {
    return (
        <img
            src="/images/logo-chisperio.png"
            alt="Chisperio"
            className={`h-10 w-auto ${invert ? 'brightness-0 invert' : ''} ${className}`}
        />
    );
}

function CartButton({ cartCount, invert = false, onOpenDrawer }) {
    const baseClasses = `relative flex h-11 w-11 items-center justify-center rounded-full border transition-all ${
        invert
            ? 'border-white/20 bg-white/10 text-white hover:bg-white/15'
            : 'border-[#6000ca] bg-[#6000ca] text-white hover:bg-[#4f00a8]'
    }`;

    const badge = cartCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FF00D4] px-1 text-[10px] font-bold leading-none text-white">
            {cartCount > 99 ? '99+' : cartCount}
        </span>
    );

    return (
        <>
            {/* Mobile: abre el drawer flotante del carrito en vez de navegar — hay
                menos espacio para tener además el botón flotante propio. */}
            <button
                type="button"
                onClick={onOpenDrawer}
                className={`${baseClasses} flex md:hidden`}
                aria-label="Abrir carrito"
            >
                <ShoppingCart className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
                {badge}
            </button>

            {/* Desktop: navega a la página completa del carrito, como siempre. */}
            <Link
                href={route('carrito.index')}
                className={`${baseClasses} hidden md:flex`}
                aria-label="Carrito de compras"
            >
                <ShoppingCart className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
                {badge}
            </Link>
        </>
    );
}

function DesktopNavLink({ item, currentUrl, currentHash }) {
    const isActive = item.active(currentUrl, currentHash);
    const className = `border-b-2 pb-1 text-[13px] font-medium uppercase tracking-[0.12em] transition-colors ${
        isActive
            ? 'border-[#6000ca] text-[#6000ca]'
            : 'border-transparent text-[#4b4356] hover:border-[#6000ca]/50 hover:text-[#6000ca]'
    }`;

    if (item.type === 'route') {
        return (
            <Link href={route(item.href)} className={className}>
                {item.label}
            </Link>
        );
    }

    return (
        <a href={item.href} className={className}>
            {item.label}
        </a>
    );
}

function MobileNavLink({ item, onNavigate }) {
    const className = 'text-2xl font-semibold uppercase tracking-[0.12em] text-white transition-opacity duration-150 hover:opacity-80';

    if (item.type === 'route') {
        return (
            <Link href={route(item.href)} onClick={onNavigate} className={className}>
                {item.label}
            </Link>
        );
    }

    return (
        <a href={item.href} onClick={onNavigate} className={className}>
            {item.label}
        </a>
    );
}

export default function LandingHeader() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [currentHash, setCurrentHash] = useState('');
    const { cartCount, openCartDrawer } = useCart();
    const { url } = usePage();

    useEffect(() => {
        document.body.style.overflow = menuOpen ? 'hidden' : '';

        return () => {
            document.body.style.overflow = '';
        };
    }, [menuOpen]);

    useEffect(() => {
        setMenuOpen(false);
    }, [url]);

    useEffect(() => {
        const syncHash = () => {
            setCurrentHash(window.location.hash || '');
        };

        syncHash();
        window.addEventListener('hashchange', syncHash);

        return () => {
            window.removeEventListener('hashchange', syncHash);
        };
    }, [url]);

    return (
        <>
            <style>{`
                @keyframes chisperio-topbar-loop {
                    0% { transform: translate3d(0, 0, 0); }
                    100% { transform: translate3d(-33.333333%, 0, 0); }
                }

                @keyframes chisperio-mobile-menu-enter {
                    from { opacity: 0; transform: translate3d(0, -0.5rem, 0); }
                    to { opacity: 1; transform: translate3d(0, 0, 0); }
                }
            `}</style>

            <header className="sticky top-0 z-50">
                {menuOpen && (
                    <div
                        id="mobile-navigation"
                        className="fixed inset-0 z-[60] flex h-[100dvh] flex-col bg-[#6000ca] [animation:chisperio-mobile-menu-enter_160ms_ease-out] motion-reduce:[animation:none] md:hidden"
                    >
                        <div className="flex items-center justify-between px-5 py-4">
                            <Link href="/" onClick={() => setMenuOpen(false)} aria-label="Ir al inicio">
                                <Logo className="h-20" />
                            </Link>

                            <button
                                type="button"
                                onClick={() => setMenuOpen(false)}
                                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#6000ca]"
                                aria-label="Cerrar menú"
                            >
                                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                                </svg>
                            </button>
                        </div>

                        <nav aria-label="Navegación principal" className="flex flex-1 flex-col items-center justify-center gap-7 px-6 pb-20 text-center">
                            {NAV_LINKS.map((item) => (
                                <MobileNavLink key={item.id} item={item} onNavigate={() => setMenuOpen(false)} />
                            ))}
                        </nav>
                    </div>
                )}

                <div className={`${menuOpen ? 'hidden md:block' : ''} overflow-hidden bg-[#6000ca] text-white`}>
                    <div className="inline-flex w-max whitespace-nowrap [animation:chisperio-topbar-loop_22s_linear_infinite] will-change-transform">
                        {[0, 1, 2].map((groupIndex) => (
                            <div
                                key={groupIndex}
                                className="flex shrink-0 items-center gap-4 px-4 py-1.5 md:gap-6 md:px-5"
                                aria-hidden={groupIndex > 0}
                            >
                                {TOPBAR_MESSAGES.map((message) => (
                                    <span
                                        key={`${message.id}-${groupIndex}`}
                                        className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] md:text-xs"
                                    >
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/14">
                                            {message.icon}
                                        </span>
                                        <span>{message.text}</span>
                                    </span>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                <div className={`${menuOpen ? 'hidden md:block' : ''} border-b border-[#6000ca] bg-white/95 backdrop-blur-xl`}>
                    <div className="flex w-full items-center justify-between px-5 py-2 md:grid md:grid-cols-[1fr_auto_1fr] md:px-8">
                        <div className="flex items-center md:hidden">
                            <button
                                type="button"
                                onClick={() => setMenuOpen(true)}
                                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#6000ca]/10 bg-white text-[#6000ca] transition-colors hover:bg-[#6000ca]/[0.06]"
                                aria-label="Abrir menú"
                                aria-expanded={menuOpen}
                                aria-controls="mobile-navigation"
                            >
                                <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
                                </svg>
                            </button>
                        </div>

                        <nav className="hidden items-center gap-5 md:flex">
                            {NAV_LINKS.map((item) => (
                                <DesktopNavLink key={item.id} item={item} currentUrl={url} currentHash={currentHash} />
                            ))}
                        </nav>

                        <Link href="/" className="flex items-center justify-center">
                            <Logo className="h-[3.75rem] md:h-[4.5rem]" />
                        </Link>

                        <div className="flex justify-end">
                            <CartButton cartCount={cartCount} onOpenDrawer={openCartDrawer} />
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
}
