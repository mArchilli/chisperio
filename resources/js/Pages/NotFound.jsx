import { Head, Link, usePage } from '@inertiajs/react';
import LandingHeader from '@/Components/Landing/LandingHeader';
import LandingFooter from '@/Components/Landing/LandingFooter';

/**
 * 404 con el diseño del sitio público (ver Welcome.jsx / componentes Landing):
 * header + footer reales, tipografía negra en mayúsculas, acentos #6000ca/#FF00D4
 * y fondos difusos. La renderiza el handler de excepciones (`bootstrap/app.php`).
 */

function Sparkle({ className = '', style }) {
    return (
        // width/height explícitos: si por lo que sea una clase de tamaño no aplica,
        // el fallback es 20px (chico), nunca el default de 300px de un <svg> sin medidas.
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className} style={style}>
            <path d="M10 1.75c.35 0 .65.24.73.58l.62 2.63a4.75 4.75 0 003.54 3.54l2.63.62a.75.75 0 010 1.46l-2.63.62a4.75 4.75 0 00-3.54 3.54l-.62 2.63a.75.75 0 01-1.46 0l-.62-2.63a4.75 4.75 0 00-3.54-3.54l-2.63-.62a.75.75 0 010-1.46l2.63-.62a4.75 4.75 0 003.54-3.54l.62-2.63a.75.75 0 01.73-.58z" />
        </svg>
    );
}

// Chispas de fondo. Posición / color / opacidad / animación por `style` en línea
// (no por clases arbitrarias de Tailwind, que acá resultaron poco confiables) —
// así quedan SIEMPRE ancladas a los bordes y nunca pisan el contenido. El respeto
// a prefers-reduced-motion lo cubre la media query sobre `.chisperio-chispa`.
const CHISPAS_FONDO = [
    { pos: { top: '11%', left: '7%' }, color: '#6000ca', opacity: 0.4, size: 'h-8 w-8 sm:h-11 sm:w-11', anim: '3.5s ease-in-out 0s infinite' },
    { pos: { top: '17%', right: '8%' }, color: '#FF00D4', opacity: 0.5, size: 'h-5 w-5 sm:h-7 sm:w-7', anim: '4.2s ease-in-out .6s infinite' },
    { pos: { bottom: '13%', left: '10%' }, color: '#FF00D4', opacity: 0.45, size: 'h-5 w-5 sm:h-7 sm:w-7', anim: '3.8s ease-in-out 1.1s infinite' },
    { pos: { bottom: '17%', right: '7%' }, color: '#6000ca', opacity: 0.35, size: 'h-7 w-7 sm:h-10 sm:w-10', anim: '4.6s ease-in-out .3s infinite' },
];

function ArrowIcon() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
        </svg>
    );
}

const ATAJOS = [
    { label: 'Chispas frías', route: 'tienda.index', params: { q: 'chispas frías' } },
    { label: 'Fuegos artificiales', route: 'tienda.index', params: { q: 'fuegos artificiales' } },
    { label: 'Velas y bengalas', route: 'tienda.index', params: { q: 'bengala' } },
    { label: 'Alquiler de maquinaria', href: '/#alquiler' },
];

const chipClassName =
    'inline-flex items-center gap-1.5 rounded-full border border-[#6000ca]/20 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.06em] text-[#4b4356] transition-all hover:-translate-y-0.5 hover:border-[#6000ca] hover:text-[#6000ca] hover:shadow-sm active:scale-95 motion-reduce:transform-none';

function Atajo({ atajo }) {
    const contenido = (
        <>
            <Sparkle className="h-3 w-3 text-[#6000ca]" />
            {atajo.label}
        </>
    );

    if (atajo.href) {
        return (
            <a href={atajo.href} className={chipClassName}>
                {contenido}
            </a>
        );
    }

    return (
        <Link href={route(atajo.route, atajo.params)} className={chipClassName}>
            {contenido}
        </Link>
    );
}

export default function NotFound() {
    const { auth } = usePage().props;

    return (
        <div className="flex min-h-screen flex-col bg-[#fcf9f8] text-[#1c1b1b] antialiased">
            <Head title="Página no encontrada" />

            <style>{`
                @keyframes chisperio-404-twinkle {
                    0%, 100% { transform: scale(.86) rotate(0deg); }
                    50% { transform: scale(1.06) rotate(12deg); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .chisperio-chispa { animation: none !important; }
                }
            `}</style>

            <LandingHeader />

            <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden border-b-2 border-[#6000ca] bg-[#f7f6fb] px-5 py-16 sm:px-8 md:py-24">
                {/* Fondos difusos — mismo recurso visual que las secciones de la landing */}
                <div className="pointer-events-none absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-[#6000ca]/[0.06] blur-3xl" aria-hidden="true" />
                <div className="pointer-events-none absolute -bottom-48 -right-32 h-[32rem] w-[32rem] rounded-full bg-[#FF00D4]/[0.03] blur-3xl" aria-hidden="true" />

                {/* Chispas decorativas */}
                {CHISPAS_FONDO.map((chispa, i) => (
                    <Sparkle
                        key={i}
                        style={{
                            position: 'absolute',
                            ...chispa.pos,
                            color: chispa.color,
                            opacity: chispa.opacity,
                            animation: `chisperio-404-twinkle ${chispa.anim}`,
                        }}
                        className={`chisperio-chispa pointer-events-none ${chispa.size}`}
                    />
                ))}

                <div className="relative z-10 w-full max-w-3xl min-w-0 text-center">
                    <div className="flex items-center justify-center gap-1 sm:gap-2.5">
                        <span className="text-[3.75rem] font-black leading-none tracking-tighter text-[#6000ca] sm:text-8xl md:text-9xl">4</span>
                        <Sparkle
                            className="chisperio-chispa h-14 w-14 shrink-0 sm:h-20 sm:w-20 md:h-24 md:w-24"
                            style={{ color: '#FF00D4', animation: 'chisperio-404-twinkle 5s ease-in-out infinite' }}
                        />
                        <span className="text-[3.75rem] font-black leading-none tracking-tighter text-[#6000ca] sm:text-8xl md:text-9xl">4</span>
                    </div>

                    <h1 className="mt-4 text-[1.65rem] font-black uppercase leading-[0.98] tracking-[-0.02em] text-[#1c1b1b] sm:text-[2.5rem] md:text-[3.25rem]">
                        Esta chispa <span className="text-[#6000ca]">no prendió</span>
                    </h1>

                    <p className="mx-auto mt-4 max-w-lg text-sm font-medium leading-relaxed text-[#4b4356] md:text-base">
                        La página que buscás no existe o cambió de lugar. Pero tenemos todo para que
                        tu próximo evento sí encienda: chispas frías, fuegos artificiales y el
                        equipamiento para hacerlo brillar.
                    </p>

                    <div className="mx-auto mt-8 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
                        <Link
                            href={route('tienda.index')}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#6000ca] px-8 py-4 text-xs font-extrabold uppercase tracking-[0.08em] text-white shadow-lg shadow-[#6000ca]/25 transition-all hover:bg-[#4f00a8] hover:shadow-xl active:scale-95 sm:text-sm"
                        >
                            Ir al catálogo
                            <ArrowIcon />
                        </Link>
                        <a
                            href="/"
                            className="inline-flex items-center justify-center rounded-full border-2 border-[#6000ca] px-8 py-4 text-xs font-extrabold uppercase tracking-[0.08em] text-[#6000ca] transition-colors hover:bg-[#6000ca] hover:text-white active:scale-95 sm:text-sm"
                        >
                            Volver al inicio
                        </a>
                    </div>

                    {auth?.user && (
                        <Link
                            href={route('dashboard')}
                            className="mt-5 inline-block text-xs font-bold uppercase tracking-[0.08em] text-[#4b4356] underline underline-offset-4 transition-colors hover:text-[#6000ca] sm:text-sm"
                        >
                            Volver al panel
                        </Link>
                    )}

                    <div className="mt-10 border-t border-[#6000ca]/10 pt-7">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#4b4356]/70">
                            ¿Qué estabas buscando?
                        </p>
                        <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                            {ATAJOS.map((atajo) => (
                                <Atajo key={atajo.label} atajo={atajo} />
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            <LandingFooter />
        </div>
    );
}
