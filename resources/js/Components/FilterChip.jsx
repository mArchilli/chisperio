/**
 * Chip de filtro del catálogo. Compartido entre la vidriera (Tienda.jsx) y el modal de
 * aumento de precios del admin, para que ambos filtren con los mismos controles.
 * `sub`: variante más chica para las subcategorías.
 */
export default function Chip({ active, onClick, children, sub = false }) {
    if (sub) {
        return (
            <button
                type="button"
                onClick={onClick}
                className={`flex-shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-[0.08em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95 ${
                    active
                        ? 'border-[#6000ca] bg-[#6000ca]/10 text-[#6000ca]'
                        : 'border-black/[0.08] bg-[#fcf9f8] text-[#4b4356] hover:border-[#6000ca]/35 hover:text-[#6000ca]'
                }`}
            >
                {children}
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex-shrink-0 whitespace-nowrap rounded-full border px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.07em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95 ${
                active
                    ? 'border-[#6000ca] bg-[#6000ca] text-white shadow-md shadow-[#6000ca]/20'
                    : 'border-black/[0.08] bg-white text-[#4b4356] hover:border-[#6000ca]/35 hover:text-[#6000ca]'
            }`}
        >
            {children}
        </button>
    );
}
