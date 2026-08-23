import { Link } from '@inertiajs/react';

const WHOLESALER_WHATSAPP_URL = `https://wa.me/5491127930349?text=${encodeURIComponent('¡Hola! Quiero recibir información sobre compras mayoristas.')}`;

const benefits = [
    {
        id: 'discount',
        highlight: '20%',
        title: 'De descuento',
        description: 'En compras de productos por un total de $600.000 o más.',
    },
    {
        id: 'shipping',
        highlight: 'Gratis',
        title: 'Envío a domicilio',
        description: 'Recibí tu pedido a domicilio en cualquier punto de Argentina.',
    },
    {
        id: 'payments',
        highlight: 'Todos',
        title: 'Los medios de pago',
        description: 'Elegí la alternativa de pago que mejor se adapte a tu negocio.',
    },
];

export default function WholesalerSection() {
    return (
        <section
            id="mayoristas"
            aria-labelledby="wholesaler-title"
            className="scroll-mt-28 border-y border-[#6000ca]/10 bg-white md:scroll-mt-32"
        >
            <div className="relative w-full overflow-hidden bg-[#f7f6fb]">
                <picture className="block w-full">
                    <source media="(max-width: 767px)" srcSet="/images/hero-mayorista-mobile.png" />
                    <img
                        src="/images/hero-mayorista.png"
                        alt="Productos Chisperío disponibles para compra mayorista"
                        className="block h-auto w-full"
                        loading="lazy"
                    />
                </picture>

                <div className="absolute inset-x-0 top-[4.5%] flex justify-center px-7 text-center md:top-[7%] md:px-10">
                    <div className="flex w-full max-w-4xl flex-col items-center">
                        <h2
                            id="wholesaler-title"
                            className="max-w-4xl text-[clamp(1.75rem,8vw,2.45rem)] font-black uppercase leading-[0.95] tracking-tight text-[#1c1b1b] [text-wrap:balance] md:text-[clamp(2.5rem,4vw,4.75rem)]"
                        >
                            ¿Sos <span className="text-[#6000ca]">mayorista</span>? Tenemos precios para vos.
                        </h2>
                        <p className="mt-3 max-w-xl text-xs font-semibold leading-relaxed text-[#4b4356] sm:text-sm md:mt-4 md:max-w-2xl md:text-lg lg:text-xl">
                            En compras desde <strong className="font-black text-[#6000ca]">$600.000</strong>, accedé a un{' '}
                            <strong className="font-black text-[#6000ca]">20% de descuento</strong> mayorista.
                        </p>
                        <img
                            src="/images/logo-chisperio.png"
                            alt="Chisperío"
                            className="mt-4 h-auto w-32 sm:w-36 md:mt-6 md:w-52"
                            loading="lazy"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-[#f8f4fc] px-6 py-14 md:px-10 md:py-20 lg:px-10 xl:px-12">
                <div className="mx-auto grid w-full max-w-[100rem] gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start lg:gap-24 xl:gap-32 2xl:gap-40">
                    <div>
                        <h3 className="text-3xl font-black uppercase leading-[0.98] tracking-tight text-[#1c1b1b] md:text-5xl lg:text-6xl">
                            <span className="text-[#6000ca]">Más</span> productos,{' '}
                            <span className="text-[#6000ca]">mejor</span> precio
                        </h3>
                        <p className="mt-5 text-sm font-medium leading-relaxed text-[#4b4356] md:text-lg">
                            Nuestra propuesta mayorista está pensada para revendedores, productores y profesionales de eventos que necesitan comprar en volumen. Para acceder a ella, tu pedido debe alcanzar los $600.000 o más; así obtenés un 20% de descuento automático sobre la compra. Además, hacemos envíos gratis a toda Argentina y aceptamos todos los medios de pago. Hacé clic en el botón “Ir al catálogo” para empezar o, si tenés alguna duda, contactanos para que podamos asesorarte mejor.
                        </p>
                        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                            <Link
                                href={route('tienda.index')}
                                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#6000ca] px-7 py-3 text-xs font-extrabold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#4f00a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-4"
                            >
                                Ir al catálogo
                            </Link>
                            <a
                                href={WHOLESALER_WHATSAPP_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-[#6000ca] px-7 py-3 text-center text-xs font-extrabold uppercase tracking-[0.08em] text-[#6000ca] transition-colors hover:bg-[#6000ca] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-4"
                            >
                                Contactarme por WhatsApp
                            </a>
                        </div>
                    </div>

                    <div className="border-y border-[#6000ca]/25">
                        {benefits.map((benefit) => (
                            <article
                                key={benefit.id}
                                className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-5 border-b border-[#6000ca]/15 py-7 last:border-b-0 sm:grid-cols-[7rem_minmax(0,1fr)] md:gap-8 md:py-9"
                            >
                                <span className="text-2xl font-black uppercase leading-none tracking-tight text-[#6000ca] sm:text-3xl">
                                    {benefit.highlight}
                                </span>
                                <div>
                                    <h4 className="text-base font-black uppercase leading-tight tracking-[0.04em] text-[#1c1b1b] md:text-lg">
                                        {benefit.title}
                                    </h4>
                                    <p className="mt-2 text-sm font-medium leading-relaxed text-[#4b4356] md:text-base">
                                        {benefit.description}
                                    </p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
