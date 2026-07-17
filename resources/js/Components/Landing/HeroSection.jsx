import { Link } from '@inertiajs/react';

export default function HeroSection() {
    return (
        <section
            id="inicio"
            className="relative h-[calc(100svh-7rem)] w-full overflow-hidden bg-[#f7f6fb] md:h-[calc(100vh-7.75rem)]"
        >
            <img
                src="/images/img-hero-maletin.png"
                alt="Maletín Chisperio para efectos especiales"
                className="block h-full w-full object-cover object-[72%_center] md:object-contain md:object-right"
                loading="eager"
                fetchPriority="high"
            />

            <div className="absolute inset-0 bg-white/60 md:hidden" aria-hidden="true" />

            <div className="absolute inset-y-0 left-0 flex w-full items-center justify-start px-8 py-8 md:w-1/2 md:pl-20 md:pr-8 lg:pl-28 xl:pl-36">
                <div className="flex max-w-3xl flex-col items-start text-left">
                    <h1 className="text-5xl font-black uppercase leading-[0.96] tracking-tight sm:text-[3.5rem] md:text-[clamp(3.75rem,4.5vw,6rem)]">
                        <span className="block text-[#1c1b1b]">Combo de maletines</span>
                        <span className="mt-1 block text-[#6000ca]">para tu evento.</span>
                    </h1>

                    <p className="mt-5 max-w-xl text-sm font-medium leading-relaxed text-[#4b4356] sm:text-base md:mt-6 md:text-lg">
                        Maletines con 6 bases inalámbricas, 2 controles remotos configurados y listos para usar y un cargador para cargar hasta 4 bases al mismo tiempo.
                    </p>

                    <Link
                        href={route('tienda.index')}
                        className="mt-6 inline-flex items-center justify-center rounded-full bg-[#6000ca] px-10 py-4 text-base font-bold uppercase tracking-[0.08em] text-white shadow-lg shadow-[#6000ca]/25 transition-all hover:bg-[#4f00a8] hover:shadow-xl active:scale-95 md:mt-8 md:px-12 md:py-5 md:text-lg"
                    >
                        Ver combos
                    </Link>

                    <img
                        src="/images/logo-chisperio.png"
                        alt="Chisperio"
                        className="mt-6 h-auto w-40 sm:w-44 md:mt-7 md:w-52"
                    />
                </div>
            </div>
        </section>
    );
}
