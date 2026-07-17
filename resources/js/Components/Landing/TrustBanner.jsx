const Star = () => (
    <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034a1 1 0 00-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

const GoogleIcon = () => (
    <svg className="h-9 w-9" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

const TruckIcon = () => (
    <svg className="h-10 w-10 text-[#6000ca]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 6.5h10.75v9H3.5zM14.25 9h3.1l3.15 3.25v3.25h-6.25z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 19a2 2 0 100-4 2 2 0 000 4zM17.25 19a2 2 0 100-4 2 2 0 000 4zM8.75 17h6.5" />
    </svg>
);

const ClockIcon = () => (
    <svg className="h-10 w-10 text-[#6000ca]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3.25 2" />
    </svg>
);

const CrownIcon = () => (
    <svg className="h-10 w-10 text-[#6000ca]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 7l4.25 3.75L12 4.5l4.25 6.25L20.5 7 19 17H5L3.5 7zM5 20h14" />
    </svg>
);

const itemClassName = 'flex min-h-[112px] items-center gap-4 lg:px-6';

export default function TrustBanner() {
    return (
        <section id="sobre-nosotros" className="mb-14 mt-0 w-full px-6 py-4 md:mb-20 md:px-10 md:py-5 lg:px-12 xl:px-16">
            <div className="grid w-full gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
                <article className={itemClassName}>
                    <GoogleIcon />
                    <div>
                        <div className="flex gap-0.5 text-[#fbbc05]">
                            {Array.from({ length: 5 }, (_, index) => <Star key={index} />)}
                        </div>
                        <p className="mt-1 text-xl font-black text-[#1c1b1b]">4.9 / 5.0</p>
                        <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.04em] text-[#4b4356]">
                            Basado en 250+ opiniones en Google
                        </p>
                    </div>
                </article>

                <article className={`${itemClassName} lg:border-l lg:border-[#6000ca]/15`}>
                    <TruckIcon />
                    <div>
                        <h2 className="text-lg font-black uppercase leading-tight text-[#1c1b1b]">Envío gratis</h2>
                        <p className="mt-1 text-sm font-bold uppercase tracking-[0.04em] text-[#6000ca]">
                            A todo el país
                        </p>
                    </div>
                </article>

                <article className={`${itemClassName} lg:border-l lg:border-[#6000ca]/15`}>
                    <ClockIcon />
                    <h2 className="max-w-[220px] text-lg font-black uppercase leading-tight text-[#1c1b1b]">
                        +10 años en el rubro de chispas y pirotecnia
                    </h2>
                </article>

                <article className={`${itemClassName} lg:border-l lg:border-[#6000ca]/15`}>
                    <CrownIcon />
                    <h2 className="text-lg font-black uppercase leading-tight text-[#1c1b1b]">
                        MercadoLíder <span className="block text-[#6000ca]">Platinum</span>
                    </h2>
                </article>
            </div>
        </section>
    );
}
