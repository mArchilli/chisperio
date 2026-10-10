import { useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';

const INSTAGRAM_URL = 'https://www.instagram.com/chisperio.argentina/';
const DESKTOP_QUERY = '(min-width: 1024px)';
const VIDEOS = [
    'video-web-1.1',
    'video-web-2.2',
    'video-web-3.3',
    'video-web-4.4',
];

function InstagramVideo({ name, enabled }) {
    const cardRef = useRef(null);
    const videoRef = useRef(null);
    const enabledRef = useRef(enabled);
    const updatePlaybackRef = useRef(null);
    const [hasPlayed, setHasPlayed] = useState(false);

    useEffect(() => {
        const card = cardRef.current;
        const video = videoRef.current;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const connection = navigator.connection;
        let isNear = false;
        let isVisible = false;
        let sourceAttached = false;
        let disposed = false;

        const shouldAnimate = () => !reducedMotion.matches && !connection?.saveData;

        const updatePlayback = () => {
            if (disposed) return;

            if (!shouldAnimate()) {
                video.pause();
                setHasPlayed(false);
                return;
            }

            if (!enabledRef.current) {
                video.pause();
                return;
            }

            // No src is sent to the browser until this individual card is nearby.
            if (isNear && !document.hidden && !sourceAttached) {
                video.src = `/videos/social/${name}.mp4`;
                video.preload = 'auto';
                video.load();
                sourceAttached = true;
            }

            if (sourceAttached && isVisible && !document.hidden) {
                // Autoplay may be blocked by browser or battery-saving settings.
                // The static poster remains visible in that case.
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        };
        updatePlaybackRef.current = updatePlayback;

        let loadObserver;
        let visibilityObserver;

        if ('IntersectionObserver' in window) {
            loadObserver = new IntersectionObserver(([entry]) => {
                isNear = entry.isIntersecting;
                updatePlayback();
            }, { rootMargin: '200px 0px', threshold: 0 });

            visibilityObserver = new IntersectionObserver(([entry]) => {
                isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
                updatePlayback();
            }, { threshold: [0, 0.25] });

            loadObserver.observe(card);
            visibilityObserver.observe(card);
        }
        // Older browsers retain the static poster rather than downloading every clip.

        document.addEventListener('visibilitychange', updatePlayback);
        reducedMotion.addEventListener('change', updatePlayback);
        connection?.addEventListener('change', updatePlayback);

        return () => {
            disposed = true;
            updatePlaybackRef.current = null;
            loadObserver?.disconnect();
            visibilityObserver?.disconnect();
            document.removeEventListener('visibilitychange', updatePlayback);
            reducedMotion.removeEventListener('change', updatePlayback);
            connection?.removeEventListener('change', updatePlayback);
            video.pause();
            if (sourceAttached) {
                video.removeAttribute('src');
                video.load();
            }
        };
    }, [name]);

    useEffect(() => {
        enabledRef.current = enabled;
        updatePlaybackRef.current?.();
    }, [enabled]);

    return (
        <div
            ref={cardRef}
            className="relative aspect-[9/16] w-full overflow-hidden rounded-[1.5rem] border border-black/[0.06] bg-[#1c1b1b] shadow-[0_18px_45px_-30px_rgba(28,27,27,0.45)] lg:rounded-[2rem]"
        >
            <img
                src={`/videos/posters/${name}.webp`}
                alt=""
                width="450"
                height="800"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
            />
            <video
                ref={videoRef}
                muted
                loop
                playsInline
                preload="none"
                controls={false}
                disablePictureInPicture
                disableRemotePlayback
                tabIndex={-1}
                aria-hidden="true"
                onPlaying={() => setHasPlayed(true)}
                onError={() => setHasPlayed(false)}
                className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${hasPlayed ? 'opacity-100' : 'opacity-0'}`}
            />
        </div>
    );
}

export default function SocialSection() {
    const [activeVideo, setActiveVideo] = useState(0);
    const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [carouselRef, carousel] = useEmblaCarousel({
        loop: true,
        align: 'center',
        duration: reducedMotion ? 0 : 25,
        breakpoints: { [DESKTOP_QUERY]: { active: false } },
    });

    useEffect(() => {
        const desktop = window.matchMedia(DESKTOP_QUERY);
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const updatePreferences = () => {
            setIsDesktop(desktop.matches);
            setReducedMotion(motion.matches);
        };
        updatePreferences();
        desktop.addEventListener('change', updatePreferences);
        motion.addEventListener('change', updatePreferences);
        return () => {
            desktop.removeEventListener('change', updatePreferences);
            motion.removeEventListener('change', updatePreferences);
        };
    }, []);

    useEffect(() => {
        if (!carousel) return;
        const updateActiveVideo = () => setActiveVideo(carousel.selectedScrollSnap());
        updateActiveVideo();
        carousel.on('select', updateActiveVideo);
        carousel.on('reInit', updateActiveVideo);
        return () => {
            carousel.off('select', updateActiveVideo);
            carousel.off('reInit', updateActiveVideo);
        };
    }, [carousel]);

    useEffect(() => {
        if (!carousel) return;
        const slides = carousel.slideNodes();
        const visuals = slides.map((slide) => slide.querySelector('[data-social-video-visual]'));
        const resetVisuals = () => {
            slides.forEach((slide, index) => {
                slide.style.removeProperty('z-index');
                visuals[index].style.removeProperty('transform');
                visuals[index].style.removeProperty('opacity');
            });
        };

        if (isDesktop) {
            resetVisuals();
            return;
        }

        const updateVisuals = () => {
            const viewport = carousel.rootNode().getBoundingClientRect();
            const center = viewport.left + viewport.width / 2;
            // Measure the fixed slide wrappers before writing styles. Their positions
            // already include Embla's loop offsets, including the last-to-first swipe.
            const positions = slides.map((slide) => slide.getBoundingClientRect());
            positions.forEach((position, index) => {
                if (!position.width) return;
                const offset = position.left + position.width / 2 - center;
                const distance = reducedMotion
                    ? (index === carousel.selectedScrollSnap() ? 0 : 1)
                    : Math.min(Math.abs(offset) / position.width, 1);
                const scale = 1 - distance * 0.12;
                const inset = -Math.sign(offset) * distance * position.width * 0.17;

                // Transform an inner wrapper so the measured carousel geometry stays
                // unchanged. Direct style updates follow the gesture without rerenders.
                visuals[index].style.transform = `translateX(${inset}px) scale(${scale})`;
                visuals[index].style.opacity = String(1 - distance * 0.18);
                slides[index].style.zIndex = String(Math.round(100 - distance * 80));
            });
        };

        updateVisuals();
        if (!reducedMotion) carousel.on('scroll', updateVisuals);
        carousel.on('select', updateVisuals);
        carousel.on('reInit', updateVisuals);
        return () => {
            carousel.off('scroll', updateVisuals);
            carousel.off('select', updateVisuals);
            carousel.off('reInit', updateVisuals);
            resetVisuals();
        };
    }, [carousel, isDesktop, reducedMotion]);

    const handleKeyDown = (event) => {
        if (isDesktop || !carousel) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            if (event.key === 'ArrowLeft') carousel.scrollPrev();
            else carousel.scrollNext();
        }
    };

    return (
        <section
            id="redes"
            aria-labelledby="social-section-title"
            className="w-full scroll-mt-32 bg-[#fcf9f8] px-6 py-16 md:px-10 md:py-20 lg:px-12 xl:px-16"
        >
            <div className="mb-8 max-w-5xl md:mb-10">
                <h2
                    id="social-section-title"
                    className="text-[2.5rem] font-black uppercase leading-[0.96] tracking-tight text-[#1c1b1b] md:text-[3.25rem] lg:text-[clamp(3rem,4.4vw,4.75rem)]"
                >
                    Seguinos en <span className="text-[#6000ca]">redes</span>
                </h2>
                <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-[#4b4356] md:text-base">
                    Somos activos en Instagram, seguinos en{' '}
                    <a
                        href={INSTAGRAM_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Seguir a @chisperio.argentina en Instagram (se abre en otra pestaña)"
                        className="rounded-sm font-bold text-[#6000ca] underline decoration-[#6000ca]/35 underline-offset-4 transition-colors hover:text-[#4f00a8] hover:decoration-[#6000ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-4"
                    >
                        @chisperio.argentina
                    </a>
                    . Todos los días subimos contenido y creamos ofertas únicas de ese canal.
                </p>
            </div>

            <div
                ref={carouselRef}
                role="region"
                aria-roledescription={isDesktop ? undefined : 'carrusel'}
                aria-label="Videos de Chisperío en Instagram"
                tabIndex={isDesktop ? undefined : 0}
                onKeyDown={handleKeyDown}
                className="-mx-6 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-inset md:-mx-10 lg:mx-0 lg:overflow-visible"
            >
                <div className="flex touch-pan-y py-6 lg:grid lg:grid-cols-4 lg:gap-6 lg:pt-1">
                    {VIDEOS.map((name, index) => (
                        <div
                            key={name}
                            role="group"
                            aria-roledescription={isDesktop ? undefined : 'diapositiva'}
                            aria-label={`Video ${index + 1} de ${VIDEOS.length}`}
                            className="relative mr-4 min-w-0 flex-[0_0_76%] sm:flex-[0_0_60%] lg:mr-0"
                        >
                            <div data-social-video-visual className="origin-center">
                                <InstagramVideo name={name} enabled={isDesktop || activeVideo === index} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-center lg:hidden" aria-label="Elegir video">
                {VIDEOS.map((name, index) => (
                    <button
                        key={name}
                        type="button"
                        aria-label={`Ver video ${index + 1} de ${VIDEOS.length}`}
                        aria-pressed={activeVideo === index}
                        onClick={() => carousel?.scrollTo(index)}
                        className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca]"
                    >
                        <span className={`h-2.5 rounded-full transition-all motion-reduce:transition-none ${activeVideo === index ? 'w-6 bg-[#6000ca]' : 'w-2.5 bg-[#6000ca]/25'}`} aria-hidden="true" />
                    </button>
                ))}
            </div>
        </section>
    );
}
