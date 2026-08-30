import { useState } from 'react';
import { useWhatsAppSucursal } from '@/Context/WhatsAppSucursalContext';

const WHATSAPP_MESSAGE = '¡Hola! Tengo una consulta para Chisperío.';
const INSTAGRAM_URL = 'https://www.instagram.com/chisperio.argentina/';

const FAQS = [
    {
        id: 'envios',
        question: '¿Hacen envíos a todo el país?',
        answer: 'Sí. Coordinamos envíos a toda la Argentina. El plazo, el costo y la modalidad de entrega se confirman según tu ubicación y los productos elegidos.',
    },
    {
        id: 'compra',
        question: '¿Cómo realizo una compra?',
        answer: 'Elegí los productos del catálogo, agregalos al carrito y completá tus datos. Al finalizar, continuamos por WhatsApp para confirmar el pedido y coordinar el pago y la entrega.',
    },
    {
        id: 'asesoramiento',
        question: '¿Me ayudan a elegir el efecto adecuado?',
        answer: 'Claro. Contanos qué tipo de evento estás preparando, el espacio y el momento que querés destacar. Nuestro equipo te asesora para encontrar la opción que mejor se adapte a tu idea.',
    },
    {
        id: 'alquiler',
        question: '¿Puedo alquilar maquinaria para mi evento?',
        answer: 'Sí. Disponemos de maquinaria profesional para alquiler. Consultanos por WhatsApp con la fecha y el lugar del evento para verificar disponibilidad y coordinar todos los detalles.',
    },
    {
        id: 'pagos',
        question: '¿Qué medios de pago aceptan?',
        answer: 'Trabajamos con distintos medios de pago. Cuando confirmemos tu pedido por WhatsApp te informaremos las alternativas disponibles para que elijas la más conveniente.',
    },
    {
        id: 'mayoristas',
        question: '¿Realizan ventas mayoristas?',
        answer: 'Sí. Tenemos una propuesta para revendedores, productores y profesionales de eventos que compran en volumen. Escribinos para conocer las condiciones y recibir asesoramiento personalizado.',
    },
];

function PlusIcon({ isOpen }) {
    return (
        <span
            className="relative block h-5 w-5"
            aria-hidden="true"
        >
            <span className="absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 rounded-full bg-current" />
            <span
                className={`absolute left-1/2 top-0 h-5 w-0.5 -translate-x-1/2 rounded-full bg-current transition-transform duration-300 motion-reduce:transition-none ${
                    isOpen ? 'rotate-90' : 'rotate-0'
                }`}
            />
        </span>
    );
}

function WhatsAppIcon() {
    return (
        <svg viewBox="0 0 32 32" className="h-6 w-6 fill-current lg:h-9 lg:w-9" aria-hidden="true">
            <path d="M16.003 2.667C8.636 2.667 2.667 8.636 2.667 16c0 2.354.617 4.562 1.693 6.476L2.667 29.333l7.061-1.852A13.267 13.267 0 0016.003 29.333C23.369 29.333 29.333 23.369 29.333 16S23.369 2.667 16.003 2.667zm0 24.267a11.12 11.12 0 01-5.667-1.553l-.406-.24-4.19 1.099 1.12-4.086-.265-.42A11.12 11.12 0 014.882 16c0-6.135 4.992-11.12 11.12-11.12S27.12 9.865 27.12 16s-4.986 10.934-11.117 10.934zm6.1-8.294c-.334-.167-1.974-.974-2.28-1.085-.306-.112-.53-.167-.752.167-.224.334-.865 1.085-1.06 1.308-.194.224-.39.251-.723.084-.334-.167-1.408-.52-2.682-1.657-.991-.886-1.66-1.98-1.854-2.314-.194-.334-.021-.514.146-.68.15-.149.334-.39.501-.585.167-.195.224-.334.334-.557.112-.224.056-.419-.028-.585-.084-.167-.752-1.813-1.03-2.481-.272-.651-.548-.563-.752-.574-.194-.01-.419-.012-.64-.012-.224 0-.585.084-.89.418-.306.334-1.168 1.14-1.168 2.782s1.196 3.228 1.362 3.451c.167.224 2.354 3.595 5.705 5.044.797.344 1.419.55 1.904.703.8.255 1.53.219 2.106.133.642-.096 1.974-.807 2.252-1.587.278-.78.278-1.45.195-1.587-.083-.14-.306-.224-.64-.39z" />
        </svg>
    );
}

function InstagramIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current lg:h-9 lg:w-9" aria-hidden="true">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072C2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838A6.162 6.162 0 1012 18.162 6.162 6.162 0 0012 5.838zm0 10.162a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
    );
}

function SocialLink({ href, label, onClick, children }) {
    const className = 'flex h-12 w-12 items-center justify-center rounded-xl border border-[#6000ca]/20 bg-white text-[#6000ca] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#6000ca] hover:bg-[#6000ca] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95 motion-reduce:transform-none lg:h-16 lg:w-16 lg:rounded-2xl';

    if (onClick) {
        return (
            <button type="button" onClick={onClick} aria-label={label} className={className}>
                {children}
            </button>
        );
    }

    return (
        <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={className}>
            {children}
        </a>
    );
}

function FAQItem({ item, index, isOpen, onToggle }) {
    const questionId = `faq-question-${item.id}`;
    const answerId = `faq-answer-${item.id}`;

    return (
        <article className="border-b border-[#6000ca]/20 first:border-t">
            <h3>
                <button
                    id={questionId}
                    type="button"
                    onClick={onToggle}
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    className="group flex w-full items-center gap-4 py-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-inset md:gap-6 md:py-7"
                >
                    <span className="w-8 flex-shrink-0 text-xs font-extrabold tracking-[0.12em] text-[#6000ca]/60 md:w-10 md:text-sm">
                        {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 text-base font-black uppercase leading-tight tracking-tight text-[#1c1b1b] transition-colors group-hover:text-[#6000ca] md:text-xl">
                        {item.question}
                    </span>
                    <span
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border transition-colors duration-300 md:h-11 md:w-11 ${
                            isOpen
                                ? 'border-[#6000ca] bg-[#6000ca] text-white'
                                : 'border-[#6000ca]/25 bg-white text-[#6000ca] group-hover:border-[#6000ca] group-hover:bg-[#6000ca]/[0.06]'
                        }`}
                    >
                        <PlusIcon isOpen={isOpen} />
                    </span>
                </button>
            </h3>

            <div
                id={answerId}
                role="region"
                aria-labelledby={questionId}
                hidden={!isOpen}
                className="pb-6 pl-12 pr-14 md:pb-7 md:pl-16 md:pr-20"
            >
                <p className="max-w-3xl text-sm font-medium leading-relaxed text-[#4b4356] md:text-base">
                    {item.answer}
                </p>
            </div>
        </article>
    );
}

export default function FAQSection() {
    const [openItem, setOpenItem] = useState(FAQS[0].id);
    const { abrirSelectorWhatsApp } = useWhatsAppSucursal();

    return (
        <section
            id="preguntas-frecuentes"
            aria-labelledby="faq-title"
            className="relative overflow-hidden bg-[#fcf9f8] px-6 py-16 md:px-10 md:py-20 lg:px-12 lg:py-24 xl:px-16"
        >
            <div
                className="pointer-events-none absolute -right-28 -top-32 h-80 w-80 rounded-full bg-[#6000ca]/[0.045] blur-3xl"
                aria-hidden="true"
            />

            <div className="relative grid gap-10 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)] lg:gap-20 xl:gap-28">
                <div className="-mt-8 lg:mt-0 lg:self-start">
                    <h2
                        id="faq-title"
                        className="text-[clamp(2.5rem,6vw,5.25rem)] font-black uppercase leading-[0.92] tracking-[-0.045em] text-[#1c1b1b]"
                    >
                        Preguntas <span className="text-[#6000ca]">frecuentes</span>
                    </h2>
                    <p className="mt-5 max-w-lg text-sm font-medium leading-relaxed text-[#4b4356] md:text-base">
                        Resolvé las dudas más comunes antes de preparar tu próxima compra.
                    </p>

                    <aside
                        className="mt-8 hidden overflow-hidden rounded-[1.5rem] border border-[#6000ca]/20 bg-white p-5 shadow-[0_16px_35px_-28px_rgba(96,0,202,0.75)] lg:block lg:p-6"
                        style={{
                            backgroundImage: 'radial-gradient(circle, rgba(96, 0, 202, 0.2) 1.25px, transparent 1.25px)',
                            backgroundSize: '14px 14px',
                        }}
                        aria-label="Otros canales de contacto"
                    >
                        <div className="rounded-2xl bg-white/90 p-4 backdrop-blur-[1px]">
                            <h3 className="text-base font-black uppercase leading-tight tracking-tight text-[#1c1b1b] md:text-lg">
                                ¿Tu duda no aparece acá?
                            </h3>
                            <p className="mt-2 text-xs font-medium leading-relaxed text-[#4b4356] md:text-sm">
                                Contactanos por nuestras redes.
                            </p>

                            <div className="mt-5 flex gap-3 lg:gap-4">
                                <SocialLink
                                    onClick={() => abrirSelectorWhatsApp(WHATSAPP_MESSAGE)}
                                    label="Contactar a Chisperío por WhatsApp"
                                >
                                    <WhatsAppIcon />
                                </SocialLink>
                                <SocialLink href={INSTAGRAM_URL} label="Visitar @chisperio.argentina en Instagram">
                                    <InstagramIcon />
                                </SocialLink>
                            </div>
                        </div>
                    </aside>
                </div>

                <div>
                    {FAQS.map((item, index) => (
                        <FAQItem
                            key={item.id}
                            item={item}
                            index={index}
                            isOpen={openItem === item.id}
                            onToggle={() => setOpenItem((current) => (current === item.id ? null : item.id))}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
