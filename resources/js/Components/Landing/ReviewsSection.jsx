const REVIEWS = [
    {
        id: 1,
        name: 'Carlos R.',
        initials: 'CR',
        gradient: 'from-purple-500 to-pink-500',
        text: '"La mejor calidad de chispas frías que hemos usado en el salón. 100% recomendado."',
    },
    {
        id: 2,
        name: 'Mariana V.',
        initials: 'MV',
        gradient: 'from-blue-500 to-cyan-400',
        text: '"Servicio de alquiler impecable. Puntualidad y equipos en perfecto estado."',
    },
    {
        id: 3,
        name: 'Diego M.',
        initials: 'DM',
        gradient: 'from-orange-500 to-red-500',
        text: '"Increíble calidad en los efectos especiales. Hicieron que nuestra fiesta sea memorable."',
    },
    {
        id: 4,
        name: 'Laura S.',
        initials: 'LS',
        gradient: 'from-emerald-500 to-teal-500',
        text: '"Muy buena atención y los productos llegaron rápido. Totalmente recomendable."',
    },
];

const Star = ({ size = 4 }) => (
    <svg className={`w-${size} h-${size} fill-current`} viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

export default function ReviewsSection() {
    return (
        <section className="bg-white py-10 md:py-14 border-y border-gray-100 mb-16 md:mb-20">
            <div className="px-4 md:px-6 max-w-[1280px] mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-8">
                    <div>
                        <h3 className="text-xl md:text-2xl font-bold text-[#1c1b1b]">Lo que dicen nuestros clientes</h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="font-bold text-sm text-[#FBBC05]">Excelente</span>
                            <div className="flex text-yellow-400 gap-0.5">
                                {[...Array(5)].map((_, i) => <Star key={i} size={4} />)}
                            </div>
                            <span className="text-[#4b4356] text-sm">basado en 253 reseñas de Google</span>
                        </div>
                    </div>
                </div>

                {/* Reviews scroll */}
                <div className="flex overflow-x-auto no-scrollbar gap-4 pb-2">
                    {REVIEWS.map((review) => (
                        <div
                            key={review.id}
                            className="bg-[#f6f3f2] p-5 rounded-2xl min-w-[260px] md:min-w-[280px] max-w-[320px] border border-gray-100 flex-shrink-0"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${review.gradient} flex items-center justify-center flex-shrink-0`}>
                                    <span className="text-white font-bold text-xs">{review.initials}</span>
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-[#1c1b1b]">{review.name}</p>
                                    <div className="flex text-yellow-400 gap-0.5 mt-0.5">
                                        {[...Array(5)].map((_, i) => <Star key={i} size={3} />)}
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm italic text-[#4b4356] leading-relaxed">{review.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
