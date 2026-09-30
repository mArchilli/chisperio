import { Link } from '@inertiajs/react';
import { tiendaReturnHref } from '@/lib/tiendaReturn';

export default function BackToCatalog({ cardKey }) {
    return (
        <div className="relative w-full px-3 pt-4 sm:px-4 md:pt-6">
            <Link
                href={tiendaReturnHref(cardKey)}
                className="inline-flex items-center gap-2 rounded-full border border-[#6000ca]/20 bg-white px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.07em] text-[#6000ca] shadow-sm transition-all hover:border-[#6000ca] hover:bg-[#6000ca] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Volver al catálogo
            </Link>
        </div>
    );
}
