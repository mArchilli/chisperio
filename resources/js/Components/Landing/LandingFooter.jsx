import { Link } from '@inertiajs/react';

const WHATSAPP_MESSAGE = '¡Hola! Quiero asesoramiento para mi evento.';
const WHATSAPP_URL = `https://wa.me/5491133973222?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

const FOOTER_LINKS = [
    {
        title: 'Explorá',
        links: [
            { label: 'Inicio', href: '/#inicio' },
            { label: 'Catálogo', routeName: 'tienda.index' },
            { label: 'Categorías', href: '/#tienda' },
            { label: 'Productos destacados', routeName: 'tienda.index', params: { filter: 'destacados' }, hash: 'productos' },
        ],
    },
    {
        title: 'Chisperío',
        links: [
            { label: 'Sobre nosotros', href: '/#sobre-nosotros' },
            { label: 'Alquiler de maquinaria', href: '/#alquiler' },
            { label: 'Tu carrito', routeName: 'carrito.index' },
            { label: 'Contacto por WhatsApp', href: WHATSAPP_URL, external: true },
        ],
    },
];

function ArrowIcon() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
        </svg>
    );
}

function InstagramIcon() {
    return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072C2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838A6.162 6.162 0 1012 18.162 6.162 6.162 0 0012 5.838zm0 10.162a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
    );
}

function WhatsAppIcon() {
    return (
        <svg viewBox="0 0 32 32" className="h-5 w-5 fill-current" aria-hidden="true">
            <path d="M16.003 2.667C8.636 2.667 2.667 8.636 2.667 16c0 2.354.617 4.562 1.693 6.476L2.667 29.333l7.061-1.852A13.267 13.267 0 0016.003 29.333C23.369 29.333 29.333 23.369 29.333 16S23.369 2.667 16.003 2.667zm0 24.267a11.12 11.12 0 01-5.667-1.553l-.406-.24-4.19 1.099 1.12-4.086-.265-.42A11.12 11.12 0 014.882 16c0-6.135 4.992-11.12 11.12-11.12S27.12 9.865 27.12 16s-4.986 10.934-11.117 10.934zm6.1-8.294c-.334-.167-1.974-.974-2.28-1.085-.306-.112-.53-.167-.752.167-.224.334-.865 1.085-1.06 1.308-.194.224-.39.251-.723.084-.334-.167-1.408-.52-2.682-1.657-.991-.886-1.66-1.98-1.854-2.314-.194-.334-.021-.514.146-.68.15-.149.334-.39.501-.585.167-.195.224-.334.334-.557.112-.224.056-.419-.028-.585-.084-.167-.752-1.813-1.03-2.481-.272-.651-.548-.563-.752-.574-.194-.01-.419-.012-.64-.012-.224 0-.585.084-.89.418-.306.334-1.168 1.14-1.168 2.782s1.196 3.228 1.362 3.451c.167.224 2.354 3.595 5.705 5.044.797.344 1.419.55 1.904.703.8.255 1.53.219 2.106.133.642-.096 1.974-.807 2.252-1.587.278-.78.278-1.45.195-1.587-.083-.14-.306-.224-.64-.39z" />
        </svg>
    );
}

const SOCIALS = [
    { label: 'Instagram', icon: InstagramIcon },
    { label: 'WhatsApp', icon: WhatsAppIcon, href: WHATSAPP_URL },
];

function FooterLink({ item }) {
    const className = 'group inline-flex w-fit items-center gap-2 text-sm font-semibold text-white/65 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#1c1b1b]';

    if (item.routeName) {
        const routeHref = route(item.routeName, item.params);
        const href = item.hash ? `${routeHref}#${item.hash}` : routeHref;

        return (
            <Link href={href} className={className}>
                <span className="h-1.5 w-1.5 rounded-full bg-[#8f32ff] transition-transform group-hover:scale-150" aria-hidden="true" />
                {item.label}
            </Link>
        );
    }

    return (
        <a
            href={item.href}
            target={item.external ? '_blank' : undefined}
            rel={item.external ? 'noopener noreferrer' : undefined}
            className={className}
        >
            <span className="h-1.5 w-1.5 rounded-full bg-[#8f32ff] transition-transform group-hover:scale-150" aria-hidden="true" />
            {item.label}
        </a>
    );
}

function SocialBubble({ social }) {
    const Icon = social.icon;
    const className = 'flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white transition-all hover:-translate-y-1 hover:border-[#8f32ff] hover:bg-[#6000ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1c1b1b]';

    if (!social.href) {
        return (
            <span className={className} title={`${social.label} — próximamente`} aria-label={`${social.label}, próximamente`}>
                <Icon />
            </span>
        );
    }

    return (
        <a
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
            aria-label={`Contactar por ${social.label}`}
        >
            <Icon />
        </a>
    );
}

export default function LandingFooter() {
    return (
        <footer className="border-t-2 border-[#6000ca] bg-[#1c1b1b] text-white">
            <div className="bg-[#6000ca]">
                <div className="flex w-full flex-col gap-7 px-6 py-10 md:px-10 lg:flex-row lg:items-center lg:justify-between lg:px-12 xl:px-16">
                    <div className="max-w-3xl">
                        <h2 className="text-3xl font-black uppercase leading-[0.98] tracking-tight md:text-[2.75rem]">
                            Hagamos que ese momento tenga su propia chispa.
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-white/75 md:text-base">
                            Contanos qué estás preparando y te ayudamos a elegir el efecto o la maquinaria ideal.
                        </p>
                    </div>

                    <a
                        href={WHATSAPP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-fit flex-shrink-0 items-center gap-3 rounded-full bg-white px-6 py-4 text-xs font-extrabold uppercase tracking-[0.08em] text-[#6000ca] shadow-lg transition-all hover:bg-[#1c1b1b] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#6000ca] active:scale-95 md:px-8"
                    >
                        <WhatsAppIcon />
                        Hablemos por WhatsApp
                        <ArrowIcon />
                    </a>
                </div>
            </div>

            <div className="w-full px-6 pb-6 pt-12 md:px-10 md:pb-8 md:pt-14 lg:px-12 xl:px-16">
                <div className="grid gap-12 border-b border-white/10 pb-12 md:grid-cols-2 lg:grid-cols-[minmax(320px,1.2fr)_minmax(0,1fr)] lg:gap-20">
                    <div className="max-w-xl">
                        <a href="/#inicio" className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#1c1b1b]" aria-label="Volver al inicio">
                            <img
                                src="/images/logo-chisperio.png"
                                alt="Chisperío"
                                className="h-24 w-auto md:h-28"
                                loading="lazy"
                            />
                        </a>
                        <p className="mt-5 max-w-md text-sm font-medium leading-relaxed text-white/60 md:text-base">
                            Efectos especiales, productos y maquinaria para transformar celebraciones en momentos inolvidables.
                        </p>

                        <div className="mt-7">
                            <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/45 md:text-xs">
                                Encontranos
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {SOCIALS.map((social) => (
                                    <SocialBubble key={social.label} social={social} />
                                ))}
                            </div>
                        </div>
                    </div>

                    <nav className="grid grid-cols-2 gap-8 sm:gap-12" aria-label="Navegación del pie de página">
                        {FOOTER_LINKS.map((group) => (
                            <div key={group.title}>
                                <h3 className="text-xs font-extrabold uppercase tracking-[0.14em] text-white">
                                    {group.title}
                                </h3>
                                <ul className="mt-5 space-y-3.5">
                                    {group.links.map((item) => (
                                        <li key={item.label}>
                                            <FooterLink item={item} />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>
                </div>

                <div className="grid gap-3 pt-6 uppercase sm:grid-cols-3 sm:items-center">
                    <p className="text-center text-[11px] font-semibold tracking-[0.08em] text-white/40 sm:text-left">
                        © {new Date().getFullYear()} Chisperío. Todos los derechos reservados.
                    </p>
                    <p className="text-center text-[13px] font-extrabold tracking-[0.1em] text-white/60 md:text-[15px]">
                        Powered by <span className="text-[#8f32ff]">PAMPA LABS</span>
                    </p>
                    <span className="hidden sm:block" aria-hidden="true" />
                </div>
            </div>
        </footer>
    );
}
