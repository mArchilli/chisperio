export default function HeroSection() {
    return (
        <section id="inicio" className="px-4 md:px-6 pt-8 md:pt-16 pb-12 md:pb-20 max-w-[1440px] mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">

                {/* Hero visual — first on mobile */}
                <div className="w-full md:w-7/12 order-1 md:order-2">
                    <div className="relative rounded-[2rem] overflow-hidden aspect-[4/3] shadow-2xl">
                        <img
                            src="/images/imagen-hero.png"
                            alt="Imagen hero"
                            className="absolute inset-0 h-full w-full object-cover object-center"
                            loading="lazy"
                        />

                        {/* Brand badge */}
                        <div className="absolute bottom-6 left-6 bg-white/20 backdrop-blur-md rounded-2xl px-4 py-3">
                            <p className="text-white font-black text-xl tracking-tight">Chisperío</p>
                            <p className="text-white/80 text-xs font-medium">Efectos Especiales Profesionales</p>
                        </div>
                    </div>
                </div>

                {/* Text content — second on mobile */}
                <div className="w-full md:w-5/12 order-2 md:order-1 flex flex-col gap-5">
                    {/* Badge */}
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-[#ab008e] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
                        </svg>
                        <span className="text-[#ab008e] font-bold text-xs uppercase tracking-widest">Premium Event Effects</span>
                    </div>

                    {/* Headline */}
                    <h2 className="text-[40px] md:text-[48px] font-black text-[#1c1b1b] leading-[1.05] tracking-tight">
                        Crea Momentos{' '}
                        <span className="text-[#6000ca] italic">Inolvidables</span>
                    </h2>

                    {/* Description */}
                    <p className="text-[#4b4356] text-base md:text-[18px] leading-relaxed max-w-md">
                        Transformamos celebraciones en espectáculos de alto impacto con tecnología de efectos especiales de grado profesional.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-wrap gap-4 pt-2">
                        <a
                            href="#tienda"
                            className="bg-[#FF00D4] text-white px-7 py-4 rounded-full font-bold text-sm shadow-lg shadow-pink-500/30 hover:brightness-110 active:scale-95 transition-all"
                        >
                            Explorar Tienda
                        </a>
                        <a
                            href="#alquiler"
                            className="border-2 border-[#6000ca] text-[#6000ca] px-7 py-4 rounded-full font-bold text-sm hover:bg-purple-50 active:scale-95 transition-all"
                        >
                            Ver Alquileres
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
