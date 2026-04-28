const GRADIENTS = [
    'from-purple-600 to-pink-500',
    'from-cyan-500 to-blue-600',
    'from-orange-500 to-red-500',
    'from-emerald-500 to-teal-600',
    'from-yellow-500 to-orange-500',
    'from-indigo-600 to-violet-600',
];

export default function CategoriesSection({ categorias }) {
    if (!categorias || categorias.length === 0) return null;

    return (
        <section id="tienda" className="mb-16 md:mb-20">
            {/* Header */}
            <div className="px-4 md:px-6 mb-6 flex justify-between items-end max-w-[1280px] mx-auto">
                <div>
                    <h3 className="text-2xl md:text-[32px] font-bold text-[#1c1b1b]">Categorías Destacadas</h3>
                    <p className="text-[#4b4356] text-sm md:text-base mt-1">Equipamiento especializado para cada necesidad</p>
                </div>
                <button className="text-[#6000ca] font-bold text-sm flex items-center gap-1 hover:underline flex-shrink-0 ml-4">
                    Ver Todo
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Horizontal scroll */}
            <div className="flex overflow-x-auto no-scrollbar gap-4 md:gap-6 px-4 md:px-6 pb-4 max-w-[1280px] mx-auto">
                {categorias.map((cat, idx) => (
                    <div key={cat.id} className="flex-none w-56 md:w-72 group cursor-pointer">
                        <div
                            className={`relative h-[260px] md:h-[380px] rounded-3xl overflow-hidden shadow-sm group-hover:shadow-xl transition-all duration-500 bg-gradient-to-br ${GRADIENTS[idx % GRADIENTS.length]}`}
                        >
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                            {/* Decorative bg icon */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                                <svg className="w-36 h-36 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>

                            {/* Top badge */}
                            <div className="absolute top-4 left-4">
                                <span className="text-[11px] font-bold text-white/90 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full uppercase tracking-wider">
                                    Categoría
                                </span>
                            </div>

                            {/* Bottom content */}
                            <div className="absolute bottom-5 left-5 right-5 text-white">
                                <h4 className="text-lg md:text-xl font-bold leading-tight">{cat.nombre}</h4>
                                {cat.descripcion && (
                                    <p className="text-sm text-white/75 mt-1 line-clamp-2">{cat.descripcion}</p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
