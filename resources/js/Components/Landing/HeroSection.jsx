import { Link } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';

const AUTOPLAY_DELAY = 7000;

const SLIDES = [
    {
        id: 'maletines',
        image: '/images/img-hero-maletin.png',
        mobileImage: '/images/img-hero-maletin-mobile.png',
        imageAlt: 'Maletín Chisperio para efectos especiales',
        imagePosition: 'object-center md:object-contain md:object-right',
        layout: 'left',
        title: [
            { text: 'Combo de maletines', color: 'text-[#1c1b1b]' },
            { text: 'para tu evento.', color: 'text-[#6000ca]' },
        ],
        description: 'Maletines con 6 bases inalámbricas, 2 controles remotos configurados y listos para usar y un cargador para cargar hasta 4 bases al mismo tiempo.',
        buttonLabel: 'Ver combos',
        showLogo: true,
    },
    {
        id: 'pistolas',
        image: '/images/img-hero-pistolas.png',
        mobileImage: '/images/img-hero-pistolas-mobile.png',
        imageAlt: 'Pistolas AK-47 y bastones tirachispas Chisperio',
        imagePosition: 'object-center md:object-contain md:object-left',
        layout: 'right',
        title: [
            { text: 'Encendé la pista.', color: 'text-[#1c1b1b]' },
            { text: 'Sorprendé a todos.', color: 'text-[#6000ca]' },
        ],
        description: 'Sumá impacto visual a tus sets con pistolas AK-47 y bastones tirachispas. Ideales para DJs, fiestas, boliches y eventos que buscan encender al público en los momentos más importantes.',
        buttonLabel: 'Ver productos',
        showLogo: true,
    },
    {
        id: 'efectos',
        image: '/images/img-hero-efectos.png',
        mobileImage: '/images/img-hero-efectos-mobile.png',
        imageAlt: 'Bengalas, chispas frías y efectos visuales para eventos',
        imagePosition: 'object-center md:object-contain md:object-center',
        layout: 'top',
        title: [
            { text: 'Ese momento especial', color: 'text-[#1c1b1b]' },
            { text: 'merece un gran efecto', color: 'text-[#6000ca]' },
        ],
        description: 'Encontrá bengalas, velas, chispas frías y efectos visuales para darle un toque único a cumpleaños, casamientos, entradas y todo tipo de celebraciones. Sorprendé a tus invitados y convertí cada ocasión en un recuerdo inolvidable.',
        buttonLabel: 'Ver efectos para eventos',
        showLogo: false,
    },
];

function SlideContent({ slide, index, isActive }) {
    const Heading = index === 0 ? 'h1' : 'h2';
    const isTopLayout = slide.layout === 'top';

    const containerClassName = {
        left: 'absolute inset-x-0 top-0 flex w-full justify-center px-5 pb-16 pt-5 sm:px-8 sm:pt-6 md:bottom-0 md:left-0 md:right-auto md:w-1/2 md:items-center md:justify-start md:px-0 md:py-8 md:pl-20 md:pr-8 lg:pl-28 xl:pl-36',
        right: 'absolute inset-x-0 top-0 flex w-full justify-center px-5 pb-16 pt-5 sm:px-8 sm:pt-6 md:bottom-0 md:left-auto md:right-0 md:w-1/2 md:items-center md:justify-end md:px-0 md:py-8 md:pl-8 md:pr-20 lg:pr-28 xl:pr-36',
        top: 'absolute inset-x-0 top-0 flex w-full justify-center px-5 pb-16 pt-5 sm:px-8 sm:pt-6 md:px-16 md:pt-7 lg:pt-9',
    }[slide.layout];

    const contentClassName = {
        left: 'flex w-full max-w-3xl flex-col items-center text-center md:items-start md:text-left',
        right: 'flex w-full max-w-3xl flex-col items-center text-center md:items-end md:text-right',
        top: 'flex w-full max-w-6xl flex-col items-center text-center',
    }[slide.layout];

    const headingClassName = isTopLayout
        ? 'w-full text-[clamp(1.75rem,8.2vw,2.15rem)] font-black uppercase leading-[0.96] tracking-tight md:text-[clamp(2rem,4.2vw,4.75rem)]'
        : index === 0
            ? 'w-full text-[clamp(1.75rem,8.2vw,2.15rem)] font-black uppercase leading-[0.96] tracking-tight md:text-[clamp(3.75rem,4.5vw,6rem)]'
            : 'w-full text-[clamp(1.75rem,8.2vw,2.15rem)] font-black uppercase leading-[0.96] tracking-tight md:text-[clamp(3.25rem,4.2vw,5.5rem)]';

    const descriptionClassName = isTopLayout
        ? 'mt-3 w-full max-w-4xl text-xs font-medium leading-relaxed text-[#4b4356] sm:text-sm md:mt-4 md:text-base lg:text-lg'
        : index === 0
            ? 'mt-3 w-full max-w-xl text-xs font-medium leading-relaxed text-[#4b4356] sm:text-sm md:mt-6 md:text-lg'
            : 'mt-3 w-full max-w-2xl text-xs font-medium leading-relaxed text-[#4b4356] sm:text-sm md:mt-5 md:text-base lg:text-lg';

    const buttonClassName = isTopLayout
        ? 'mt-4 inline-flex items-center justify-center rounded-full bg-[#6000ca] px-8 py-3 text-xs font-bold uppercase tracking-[0.08em] text-white shadow-lg shadow-[#6000ca]/25 transition-all hover:bg-[#4f00a8] hover:shadow-xl active:scale-95 sm:text-sm md:mt-5 md:px-10 md:py-4 md:text-base'
        : 'mt-4 inline-flex items-center justify-center rounded-full bg-[#6000ca] px-8 py-3 text-xs font-bold uppercase tracking-[0.08em] text-white shadow-lg shadow-[#6000ca]/25 transition-all hover:bg-[#4f00a8] hover:shadow-xl active:scale-95 sm:text-sm md:mt-8 md:px-12 md:py-5 md:text-lg';

    return (
        <div className={containerClassName}>
            <div className={contentClassName}>
                <Heading className={headingClassName}>
                    {slide.title.map((line, lineIndex) => (
                        <span
                            key={line.text}
                            className={`${lineIndex > 0 ? 'mt-1 ' : ''}block ${line.color}`}
                        >
                            {line.text}
                        </span>
                    ))}
                </Heading>

                <p className={descriptionClassName}>
                    {slide.description}
                </p>

                <Link
                    href={route('tienda.index')}
                    className={buttonClassName}
                    tabIndex={isActive ? 0 : -1}
                >
                    {slide.buttonLabel}
                </Link>

                {slide.showLogo && (
                    <img
                        src="/images/logo-chisperio.png"
                        alt="Chisperio"
                        className="hidden h-auto md:mt-7 md:block md:w-52"
                    />
                )}
            </div>
        </div>
    );
}

function DirectionIcon({ direction }) {
    const path = direction === 'previous' ? 'M15 18l-6-6 6-6' : 'M9 6l6 6-6 6';

    return (
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={path} />
        </svg>
    );
}

export default function HeroSection() {
    const carouselRef = useRef(null);
    const [activeSlide, setActiveSlide] = useState(0);
    const [autoplayPaused, setAutoplayPaused] = useState(false);
    const [isInteracting, setIsInteracting] = useState(false);

    const scrollToSlide = useCallback((requestedIndex, behavior = 'smooth') => {
        const nextIndex = (requestedIndex + SLIDES.length) % SLIDES.length;
        const carousel = carouselRef.current;

        if (!carousel) {
            return;
        }

        carousel.scrollTo({
            left: carousel.clientWidth * nextIndex,
            behavior,
        });
        setActiveSlide(nextIndex);
    }, []);

    useEffect(() => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        if (reducedMotion.matches) {
            setAutoplayPaused(true);
        }

        const handleMotionPreference = (event) => {
            setAutoplayPaused(event.matches);
        };

        reducedMotion.addEventListener('change', handleMotionPreference);

        return () => {
            reducedMotion.removeEventListener('change', handleMotionPreference);
        };
    }, []);

    useEffect(() => {
        if (autoplayPaused || isInteracting) {
            return undefined;
        }

        const timeout = window.setTimeout(() => {
            scrollToSlide(activeSlide + 1);
        }, AUTOPLAY_DELAY);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [activeSlide, autoplayPaused, isInteracting, scrollToSlide]);

    useEffect(() => {
        const handleResize = () => {
            scrollToSlide(activeSlide, 'auto');
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [activeSlide, scrollToSlide]);

    const handleScroll = () => {
        const carousel = carouselRef.current;

        if (!carousel || carousel.clientWidth === 0) {
            return;
        }

        const nextIndex = Math.round(carousel.scrollLeft / carousel.clientWidth);

        if (nextIndex >= 0 && nextIndex < SLIDES.length) {
            setActiveSlide(nextIndex);
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            scrollToSlide(activeSlide - 1);
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault();
            scrollToSlide(activeSlide + 1);
        }
    };

    const handleBlur = (event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsInteracting(false);
        }
    };

    return (
        <section
            id="inicio"
            className="relative h-[calc(100svh-7rem)] w-full overflow-hidden border-b-2 border-[#6000ca] bg-[#f7f6fb] md:h-[calc(100vh-7.75rem)]"
            role="region"
            aria-roledescription="carrusel"
            aria-label="Promociones destacadas"
            onMouseEnter={() => setIsInteracting(true)}
            onMouseLeave={() => setIsInteracting(false)}
            onFocusCapture={() => setIsInteracting(true)}
            onBlurCapture={handleBlur}
            onKeyDown={handleKeyDown}
        >
            <div
                ref={carouselRef}
                className="no-scrollbar flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth motion-reduce:scroll-auto"
                onScroll={handleScroll}
            >
                {SLIDES.map((slide, index) => (
                    <article
                        key={slide.id}
                        className="relative h-full w-full min-w-0 shrink-0 basis-full snap-start snap-always overflow-hidden bg-[#f7f6fb]"
                        role="group"
                        aria-roledescription="diapositiva"
                        aria-label={`${index + 1} de ${SLIDES.length}`}
                        aria-hidden={activeSlide !== index}
                    >
                        <picture className="block h-full w-full">
                            <source media="(max-width: 767px)" srcSet={slide.mobileImage} />
                            <img
                                src={slide.image}
                                alt={slide.imageAlt}
                                className={`block h-full w-full object-cover ${slide.imagePosition}`}
                                loading={index === 0 ? 'eager' : 'lazy'}
                                fetchPriority={index === 0 ? 'high' : 'auto'}
                                draggable={false}
                            />
                        </picture>

                        <SlideContent slide={slide} index={index} isActive={activeSlide === index} />
                    </article>
                ))}
            </div>

            <button
                type="button"
                onClick={() => scrollToSlide(activeSlide - 1)}
                className="absolute left-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#6000ca]/15 bg-white/85 text-[#6000ca] shadow-lg backdrop-blur-sm transition-all hover:scale-105 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 md:flex"
                aria-label="Mostrar banner anterior"
            >
                <DirectionIcon direction="previous" />
            </button>

            <button
                type="button"
                onClick={() => scrollToSlide(activeSlide + 1)}
                className="absolute right-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#6000ca]/15 bg-white/85 text-[#6000ca] shadow-lg backdrop-blur-sm transition-all hover:scale-105 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 md:flex"
                aria-label="Mostrar banner siguiente"
            >
                <DirectionIcon direction="next" />
            </button>

            <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#6000ca]/10 bg-white/85 px-3 py-2 shadow-lg backdrop-blur-sm md:bottom-5">
                {SLIDES.map((slide, index) => (
                    <button
                        key={slide.id}
                        type="button"
                        onClick={() => scrollToSlide(index)}
                        className={`h-2 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 ${
                            activeSlide === index
                                ? 'w-7 bg-[#6000ca]'
                                : 'w-2 bg-[#4b4356]/35 hover:bg-[#6000ca]/60'
                        }`}
                        aria-label={`Mostrar banner ${index + 1}: ${slide.title.map((line) => line.text).join(' ')}`}
                        aria-current={activeSlide === index ? 'true' : undefined}
                    />
                ))}

                <span className="mx-0.5 h-4 w-px bg-[#6000ca]/15" aria-hidden="true" />

                <button
                    type="button"
                    onClick={() => setAutoplayPaused((paused) => !paused)}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[#6000ca] transition-colors hover:bg-[#6000ca]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2"
                    aria-label={autoplayPaused ? 'Reproducir carrusel' : 'Pausar carrusel'}
                    aria-pressed={autoplayPaused}
                >
                    {autoplayPaused ? (
                        <svg aria-hidden="true" className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6.3 3.8a1 1 0 011.5-.86l8.2 5.2a1 1 0 010 1.72l-8.2 5.2a1 1 0 01-1.5-.86V3.8z" />
                        </svg>
                    ) : (
                        <svg aria-hidden="true" className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5.75 3.5A1.25 1.25 0 017 4.75v10.5a1.25 1.25 0 01-2.5 0V4.75A1.25 1.25 0 015.75 3.5zm8.5 0a1.25 1.25 0 011.25 1.25v10.5a1.25 1.25 0 01-2.5 0V4.75a1.25 1.25 0 011.25-1.25z" />
                        </svg>
                    )}
                </button>
            </div>
        </section>
    );
}
