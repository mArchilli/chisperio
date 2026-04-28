import DOMPurify from 'dompurify';

const formatPrice = (price) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);

const stripHtml = (html) => {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = DOMPurify.sanitize(html);
    return div.textContent || '';
};

const CartIcon = ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
);

function ProductImage({ producto, className = '' }) {
    if (producto.imagen_principal) {
        return (
            <img
                src={`/${producto.imagen_principal.ruta}`}
                alt={producto.titulo}
                className={`object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500 ${className}`}
            />
        );
    }
    return (
        <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl font-black text-[#6000ca]/25 select-none">
                {producto.titulo.charAt(0).toUpperCase()}
            </span>
        </div>
    );
}

function BigProductCard({ producto }) {
    return (
        <div className="md:col-span-7 bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-xl transition-all group">
            <div className="flex flex-col md:flex-row h-full min-h-[280px]">
                {/* Info */}
                <div className="flex-1 p-6 md:p-8 flex flex-col justify-between order-2 md:order-1">
                    <div>
                        <span className="bg-cyan-100 text-cyan-800 font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-widest inline-block mb-3">
                            Destacado
                        </span>
                        <h4 className="text-xl md:text-2xl font-bold text-[#1c1b1b] mb-2 line-clamp-2">
                            {producto.titulo}
                        </h4>
                        {producto.descripcion && (
                            <p className="text-sm text-[#4b4356] mb-4 line-clamp-2">
                                {stripHtml(producto.descripcion)}
                            </p>
                        )}
                        {producto.categorias?.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {producto.categorias.map((cat) => (
                                    <span key={cat.id} className="text-xs bg-purple-50 text-[#6000ca] px-2.5 py-0.5 rounded-full font-medium">
                                        {cat.nombre}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between mt-6">
                        <div>
                            {producto.oferta_vigente ? (
                                <>
                                    <span className="text-sm text-gray-400 line-through block leading-none">
                                        {formatPrice(producto.precio)}
                                    </span>
                                    <span className="text-2xl font-black text-[#6000ca]">
                                        {formatPrice(producto.oferta_vigente.precio_oferta)}
                                    </span>
                                </>
                            ) : (
                                <span className="text-2xl font-black text-[#6000ca]">
                                    {formatPrice(producto.precio)}
                                </span>
                            )}
                        </div>
                        <button className="bg-[#ab008e] p-4 rounded-xl text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-pink-500/20">
                            <CartIcon />
                        </button>
                    </div>
                </div>

                {/* Image */}
                <div className="md:w-5/12 bg-[#f6f3f2] flex items-center justify-center p-6 min-h-[200px] order-1 md:order-2">
                    <ProductImage producto={producto} className="w-full max-h-56 md:max-h-72" />
                </div>
            </div>
        </div>
    );
}

function SmallProductCard({ producto }) {
    return (
        <div className="md:col-span-5 bg-white rounded-3xl border border-gray-100 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-xl transition-all flex flex-col group">
            {/* Image area */}
            <div className="relative bg-[#f6f3f2] rounded-2xl overflow-hidden aspect-video mb-5 flex items-center justify-center">
                {producto.oferta_vigente && (
                    <span className="absolute top-3 left-3 z-10 bg-[#FF00D4] text-white font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider">
                        {Math.round(producto.oferta_vigente.porcentaje_descuento)}% OFF
                    </span>
                )}
                <ProductImage producto={producto} className="w-3/4 h-full" />
            </div>

            <h4 className="text-base md:text-lg font-bold text-[#1c1b1b] mb-1 line-clamp-1">{producto.titulo}</h4>

            {producto.descripcion && (
                <p className="text-sm text-[#4b4356] mb-4 line-clamp-2">{stripHtml(producto.descripcion)}</p>
            )}

            <div className="mt-auto flex items-center justify-between">
                <div>
                    {producto.oferta_vigente ? (
                        <>
                            <span className="text-xs text-gray-400 line-through">{formatPrice(producto.precio)}</span>
                            <span className="text-xl font-black text-[#6000ca] block">{formatPrice(producto.oferta_vigente.precio_oferta)}</span>
                        </>
                    ) : (
                        <span className="text-xl font-black text-[#6000ca]">{formatPrice(producto.precio)}</span>
                    )}
                </div>
                <button className="border-2 border-[#6000ca] text-[#6000ca] p-3 rounded-xl hover:bg-[#6000ca] hover:text-white transition-all active:scale-95">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

function RentalBanner() {
    return (
        <div id="alquiler" className="md:col-span-7 bg-[#6000ca] rounded-3xl p-8 text-white relative overflow-hidden group shadow-lg">
            <div className="relative z-10 flex flex-col">
                <h4 className="text-2xl md:text-[28px] font-bold mb-3 max-w-xs">
                    ¿Buscas Alquiler para tu Evento?
                </h4>
                <p className="text-purple-200 text-base leading-relaxed max-w-sm mb-8">
                    Ofrecemos servicio completo con técnicos especializados para que no tengas que preocuparte por nada.
                </p>
                <div>
                    <button className="bg-white text-[#6000ca] px-8 py-4 rounded-full font-bold text-sm hover:bg-purple-50 active:scale-95 transition-all shadow-md">
                        Consultar Disponibilidad
                    </button>
                </div>
            </div>
            {/* Decorative circle */}
            <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-white/5 group-hover:bg-white/10 transition-all duration-700" />
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity duration-700">
                <svg className="w-40 h-40" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
            </div>
        </div>
    );
}

export default function FeaturedProductsSection({ productos }) {
    if (!productos || productos.length === 0) return null;

    const [mainProduct, ...rest] = productos;
    const secondaryProducts = rest.slice(0, 2);

    return (
        <section className="px-4 md:px-6 mb-16 md:mb-20 max-w-[1280px] mx-auto">
            <h3 className="text-2xl md:text-[32px] font-bold text-[#1c1b1b] mb-8">Equipos de Élite</h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-8">
                <BigProductCard producto={mainProduct} />

                {secondaryProducts.map((producto) => (
                    <SmallProductCard key={producto.id} producto={producto} />
                ))}

                <RentalBanner />
            </div>
        </section>
    );
}
