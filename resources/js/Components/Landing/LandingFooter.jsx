import { Link } from '@inertiajs/react';

const NAV_ITEMS = [
    {
        id: 'inicio',
        href: '#inicio',
        label: 'Inicio',
        icon: (active) => (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        id: 'tienda',
        href: '#tienda',
        label: 'Tienda',
        icon: (active) => (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
        ),
    },
    {
        id: 'alquiler',
        href: '#alquiler',
        label: 'Alquiler',
        icon: (active) => (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
        ),
    },
    {
        id: 'carrito',
        href: '#',
        label: 'Carrito',
        icon: (active) => (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h8" />
            </svg>
        ),
    },
    {
        id: 'perfil',
        href: 'login',
        label: 'Perfil',
        isRoute: true,
        icon: (active) => (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
    },
];

export default function LandingFooter({ canLogin }) {
    const navItems = canLogin
        ? NAV_ITEMS
        : NAV_ITEMS.filter((item) => item.id !== 'perfil');

    return (
        <>
            {/* Desktop / tablet footer */}
            <footer className="hidden md:block bg-gray-50 border-t border-gray-200 py-10 px-6">
                <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col items-center md:items-start gap-1">
                        <span className="text-xl font-black text-[#1c1b1b]">Chisperío</span>
                        <p className="text-xs text-gray-500">© {new Date().getFullYear()} Chisperío. Magia en cada evento.</p>
                    </div>

                    <nav className="flex gap-6">
                        {['Envíos', 'Garantía', 'Contacto', 'Términos'].map((label) => (
                            <a key={label} href="#" className="text-xs text-gray-500 hover:text-[#6000ca] transition-colors">
                                {label}
                            </a>
                        ))}
                    </nav>

                    <div className="flex gap-3 items-center">
                        {/* Instagram */}
                        <a href="#" className="text-[#6000ca] hover:opacity-70 transition-opacity" aria-label="Instagram">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                            </svg>
                        </a>
                        {/* Facebook */}
                        <a href="#" className="text-[#6000ca] hover:opacity-70 transition-opacity" aria-label="Facebook">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                        </a>
                    </div>
                </div>
            </footer>

            {/* Mobile bottom nav */}
            <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-stretch bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-50">
                {navItems.map((item, idx) => {
                    const isActive = idx === 0;
                    const content = (
                        <>
                            {item.icon(isActive)}
                            <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5">{item.label}</span>
                        </>
                    );

                    const baseClass = `flex flex-col items-center justify-center pt-2 pb-3 flex-1 transition-all ${
                        isActive
                            ? 'text-[#FF00D4] border-t-2 border-[#FF00D4]'
                            : 'text-gray-400 hover:text-[#6000ca] border-t-2 border-transparent'
                    }`;

                    return item.isRoute ? (
                        <Link key={item.id} href={route(item.href)} className={baseClass}>
                            {content}
                        </Link>
                    ) : (
                        <a key={item.id} href={item.href} className={baseClass}>
                            {content}
                        </a>
                    );
                })}
            </nav>

            {/* Spacer so content isn't hidden behind mobile nav */}
            <div className="md:hidden h-20" />
        </>
    );
}
