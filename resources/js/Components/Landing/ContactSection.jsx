import { useWhatsAppSucursal } from '@/Context/WhatsAppSucursalContext';

function WhatsAppIcon({ className = '' }) {
    return (
        <svg viewBox="0 0 32 32" className={`fill-current ${className}`} aria-hidden="true">
            <path d="M16.003 2.667C8.636 2.667 2.667 8.636 2.667 16c0 2.354.617 4.562 1.693 6.476L2.667 29.333l7.061-1.852A13.267 13.267 0 0016.003 29.333C23.369 29.333 29.333 23.369 29.333 16S23.369 2.667 16.003 2.667zm0 24.267a11.12 11.12 0 01-5.667-1.553l-.406-.24-4.19 1.099 1.12-4.086-.265-.42A11.12 11.12 0 014.882 16c0-6.135 4.992-11.12 11.12-11.12S27.12 9.865 27.12 16s-4.986 10.934-11.117 10.934zm6.1-8.294c-.334-.167-1.974-.974-2.28-1.085-.306-.112-.53-.167-.752.167-.224.334-.865 1.085-1.06 1.308-.194.224-.39.251-.723.084-.334-.167-1.408-.52-2.682-1.657-.991-.886-1.66-1.98-1.854-2.314-.194-.334-.021-.514.146-.68.15-.149.334-.39.501-.585.167-.195.224-.334.334-.557.112-.224.056-.419-.028-.585-.084-.167-.752-1.813-1.03-2.481-.272-.651-.548-.563-.752-.574-.194-.01-.419-.012-.64-.012-.224 0-.585.084-.89.418-.306.334-1.168 1.14-1.168 2.782s1.196 3.228 1.362 3.451c.167.224 2.354 3.595 5.705 5.044.797.344 1.419.55 1.904.703.8.255 1.53.219 2.106.133.642-.096 1.974-.807 2.252-1.587.278-.78.278-1.45.195-1.587-.083-.14-.306-.224-.64-.39z" />
        </svg>
    );
}

function InstagramIcon({ className = '' }) {
    return (
        <svg className={`fill-current ${className}`} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072C2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838A6.162 6.162 0 1012 18.162 6.162 6.162 0 0012 5.838zm0 10.162a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
    );
}

function TikTokIcon({ className = '' }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.1} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 4v10.25a4.25 4.25 0 11-3.5-4.18" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 4c.55 2.45 2.15 4.05 4.6 4.6" />
        </svg>
    );
}

// Completá cada `href` con la URL pública cuando las redes estén disponibles.
// La tarjeta de WhatsApp no lleva `href`: abre el modal de selección de sucursal.
const CONTACT_CHANNELS = [
    {
        id: 'whatsapp',
        name: 'WhatsApp',
        description: 'Escribinos para recibir atención personalizada sobre productos, pedidos o alquileres.',
        href: null,
        whatsapp: true,
        message: '¡Hola! Tengo una consulta para Chisperío.',
        icon: WhatsAppIcon,
    },
    {
        id: 'instagram',
        name: 'Instagram',
        description: 'Chatea con nosotros y enterate de todos los productos con nuestros reels e historias.',
        href: null,
        icon: InstagramIcon,
    },
    {
        id: 'tiktok',
        name: 'TikTok',
        description: 'Mirá nuestros efectos en acción y encontrá inspiración para tu próxima celebración.',
        href: null,
        icon: TikTokIcon,
    },
];

function CardContent({ channel }) {
    const Icon = channel.icon;

    return (
        <>
            <div className="flex min-h-[230px] flex-1 items-center justify-center rounded-[1.4rem] bg-[#6000ca]/[0.045] text-[#6000ca] transition-colors duration-300 group-hover:bg-[#6000ca]/[0.08] sm:min-h-[250px] md:min-h-[270px] lg:min-h-[300px]">
                <Icon className="h-44 w-44 transition-transform duration-300 group-hover:scale-105 sm:h-48 sm:w-48 md:h-52 md:w-52 lg:h-60 lg:w-60 motion-reduce:transform-none" />
            </div>

            <div className="px-1 pb-1 pt-6 md:pt-7">
                <h3 className="text-2xl font-black uppercase leading-tight tracking-tight text-[#6000ca] md:text-3xl">
                    {channel.name}
                </h3>
                <p className="mt-3 text-sm font-medium leading-relaxed text-[#4b4356]">
                    {channel.description}
                </p>
            </div>
        </>
    );
}

function ContactCard({ channel, onWhatsApp }) {
    const hasDestination = Boolean(channel.href);
    const baseClassName = 'relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-[#6000ca]/30 bg-white p-4 shadow-[0_14px_34px_-26px_rgba(28,27,27,0.55)] sm:p-5 md:rounded-[2rem] md:p-6';
    const interactiveClassName = `group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-[#6000ca] hover:shadow-[0_24px_45px_-25px_rgba(96,0,202,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-4 active:scale-[0.99] motion-reduce:transform-none ${baseClassName}`;

    if (channel.whatsapp) {
        return (
            <button
                type="button"
                onClick={() => onWhatsApp(channel.message)}
                aria-label={`Contactar por ${channel.name}`}
                className={`w-full text-left ${interactiveClassName}`}
            >
                <CardContent channel={channel} />
            </button>
        );
    }

    const handleClick = (event) => {
        if (!hasDestination) event.preventDefault();
    };

    return (
        <a
            href={hasDestination ? channel.href : '#'}
            target={hasDestination ? '_blank' : undefined}
            rel={hasDestination ? 'noopener noreferrer' : undefined}
            onClick={handleClick}
            aria-label={`Contactar por ${channel.name}`}
            aria-disabled={hasDestination ? undefined : 'true'}
            className={interactiveClassName}
        >
            <CardContent channel={channel} />
        </a>
    );
}

export default function ContactSection() {
    const { abrirSelectorWhatsApp } = useWhatsAppSucursal();

    return (
        <section
            id="contacto"
            aria-labelledby="contact-section-title"
            className="relative scroll-mt-32 overflow-hidden border-y border-[#6000ca]/10 bg-[#f7f4fa] pb-16 pt-3 md:pb-24 md:pt-4"
        >
            <div className="pointer-events-none absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-[#6000ca]/[0.04] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-[#FF00D4]/[0.025] blur-3xl" />

            <div className="relative w-full px-4 sm:px-5 md:px-6 lg:px-8">
                <div className="max-w-6xl">
                    <h2
                        id="contact-section-title"
                        className="text-[clamp(2.25rem,9vw,5.25rem)] font-black uppercase leading-[0.94] tracking-[-0.05em] text-[#1c1b1b]"
                    >
                        Cualquier consulta, ponete en <span className="text-[#6000ca]">contacto</span> con nosotros.
                    </h2>
                </div>

                <div className="mt-10 grid grid-cols-1 gap-4 md:mt-12 md:grid-cols-3 md:gap-5 lg:gap-6">
                    {CONTACT_CHANNELS.map((channel) => (
                        <ContactCard key={channel.id} channel={channel} onWhatsApp={abrirSelectorWhatsApp} />
                    ))}
                </div>
            </div>
        </section>
    );
}
