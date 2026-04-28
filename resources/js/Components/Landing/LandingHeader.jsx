import { Link } from '@inertiajs/react';
import { useState } from 'react';

export default function LandingHeader({ canLogin }) {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="bg-white/90 backdrop-blur-xl sticky top-0 z-50 border-b border-gray-100 shadow-sm">
            <div className="flex justify-between items-center px-4 md:px-6 py-4 max-w-[1280px] mx-auto">
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
                    <span className="text-2xl font-black text-[#6000ca] tracking-tight select-none">Chisperío</span>
                </div>

                {/* Center: desktop nav */}
                <nav className="hidden md:flex items-center gap-6">
                    <a href="#inicio" className="text-[#6000ca] font-semibold text-sm hover:opacity-70 transition-opacity">Inicio</a>
                    <a href="#tienda" className="text-gray-500 font-semibold text-sm hover:text-[#6000ca] transition-colors">Tienda</a>
                    <a href="#alquiler" className="text-gray-500 font-semibold text-sm hover:text-[#6000ca] transition-colors">Alquiler</a>
                </nav>

                {/* Right: auth + cart */}
                <div className="flex items-center gap-1">
                    {canLogin && (
                        <Link
                            href={route('login')}
                            className="hidden md:inline-flex items-center px-4 py-2 text-sm font-semibold text-[#6000ca] rounded-xl hover:bg-purple-50 transition-colors"
                        >
                            Ingresar
                        </Link>
                    )}
                    <button className="p-2 rounded-xl hover:bg-gray-50 transition-colors" aria-label="Carrito">
                        <svg className="w-6 h-6 text-[#6000ca]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile dropdown */}
            {menuOpen && (
                <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-1">
                    {[['#inicio', 'Inicio'], ['#tienda', 'Tienda'], ['#alquiler', 'Alquiler']].map(([href, label]) => (
                        <a key={href} href={href} onClick={() => setMenuOpen(false)} className="font-semibold text-sm text-gray-700 py-2.5 hover:text-[#6000ca] transition-colors">
                            {label}
                        </a>
                    ))}
                    {canLogin && (
                        <Link href={route('login')} className="font-semibold text-sm text-[#6000ca] py-2.5">Ingresar</Link>
                    )}
                </div>
            )}
        </header>
    );
}
