const Star = () => (
    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

export default function TrustBanner() {
    return (
        <section className="px-4 md:px-6 mb-12 md:mb-20 max-w-[1280px] mx-auto">
            <div className="bg-[#f6f3f2] rounded-2xl py-5 px-5 md:px-10 flex flex-wrap justify-center md:justify-between items-center gap-5 border border-gray-100">

                {/* Google rating */}
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg shadow-sm flex-shrink-0">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                    </div>
                    <div>
                        <div className="flex text-yellow-400 gap-0.5">
                            {[...Array(5)].map((_, i) => <Star key={i} />)}
                        </div>
                        <p className="text-[11px] font-bold text-[#4b4356] uppercase tracking-tight mt-0.5">
                            4.9 / 5.0 · Basado en 250+ opiniones
                        </p>
                    </div>
                </div>

                <div className="hidden lg:block h-8 w-px bg-[#cdc2da]" />

                {/* Free shipping */}
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#ab008e]/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[#ab008e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                    </div>
                    <span className="font-bold text-sm text-[#1c1b1b]">Envío Gratis en Máquinas</span>
                </div>

                <div className="hidden lg:block h-8 w-px bg-[#cdc2da]" />

                {/* Warranty */}
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#6000ca]/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[#6000ca]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <span className="font-bold text-sm text-[#1c1b1b]">2 Años de Garantía</span>
                </div>
            </div>
        </section>
    );
}
