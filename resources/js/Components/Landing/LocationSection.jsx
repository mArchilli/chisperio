import { useWhatsAppSucursal } from '@/Context/WhatsAppSucursalContext';

const MAP_EMBED_URL =
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3281.708847964445!2d-58.678936224025605!3d-34.66205517293351!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8f7e9e5929cf69c9%3A0xd23641ad42e2ddaf!2sChisperio!5e0!3m2!1ses-419!2sar!4v1790792353123!5m2!1ses-419!2sar';
const MAP_ADDRESS = 'Chisperio, Int. Pérez Quintana 249, B1714 Ituzaingó, Provincia de Buenos Aires';
const MAP_DIRECTIONS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAP_ADDRESS)}`;
const WHATSAPP_MESSAGE = '¡Hola! Quiero coordinar el retiro de mi pedido en sus oficinas.';

const POINTS = [
    'Sin local abierto al público: son nuestras oficinas.',
    'Retiro en persona con coordinación previa.',
    'Si preferís, también enviamos a todo el país.',
];

function PinIcon({ className = 'h-5 w-5' }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-5.686-7-11a7 7 0 1114 0c0 5.314-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    );
}

export default function LocationSection() {
    const { abrirSelectorWhatsApp } = useWhatsAppSucursal();

    return (
        <section
            id="donde-estamos"
            aria-labelledby="location-title"
            className="relative overflow-hidden border-t border-[#6000ca]/10 bg-[#f7f4fa] px-6 py-16 md:px-10 md:py-20 lg:px-12 lg:py-24 xl:px-16"
        >
            <div
                className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#6000ca]/[0.05] blur-3xl"
                aria-hidden="true"
            />

            <div className="relative grid items-stretch gap-8 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.4fr)] lg:gap-14 xl:gap-20">
                <div className="flex flex-col justify-center">
                    <h2
                        id="location-title"
                        className="text-[clamp(2.5rem,6vw,4.75rem)] font-black uppercase leading-[0.92] tracking-[-0.045em] text-[#1c1b1b]"
                    >
                        ¿Dónde <span className="text-[#6000ca]">estamos?</span>
                    </h2>

                    <p className="mt-5 max-w-lg text-sm font-medium leading-relaxed text-[#4b4356] md:text-base">
                        No contamos con un local físico, pero nuestras oficinas están ubicadas en este punto. Si querés
                        retirar tu pedido personalmente, la posibilidad existe: coordinamos día y horario con vos.
                    </p>

                    <ul className="mt-6 space-y-3">
                        {POINTS.map((point) => (
                            <li key={point} className="flex items-start gap-3 text-sm font-semibold text-[#1c1b1b]">
                                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#6000ca] text-white">
                                    <CheckIcon />
                                </span>
                                {point}
                            </li>
                        ))}
                    </ul>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                        <button
                            type="button"
                            onClick={() => abrirSelectorWhatsApp(WHATSAPP_MESSAGE)}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#6000ca] px-6 py-3.5 text-xs font-extrabold uppercase tracking-[0.08em] text-white shadow-lg shadow-[#6000ca]/20 transition-all hover:bg-[#4f00a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-4 active:scale-95"
                        >
                            Coordinar retiro
                        </button>
                        <a
                            href={MAP_DIRECTIONS_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#6000ca]/25 bg-white px-6 py-3.5 text-xs font-extrabold uppercase tracking-[0.08em] text-[#6000ca] transition-all hover:border-[#6000ca] hover:bg-[#6000ca] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-4 active:scale-95"
                        >
                            <PinIcon className="h-4 w-4" />
                            Cómo llegar
                        </a>
                    </div>
                </div>

                {/* El mapa de Google no admite estilos propios: se lo muestra en escala de grises y recupera
                    sus colores al pasar el mouse/tocarlo. */}
                <div className="group relative min-h-[340px] overflow-hidden rounded-[2rem] border-2 border-[#6000ca]/25 bg-white shadow-[0_24px_60px_-34px_rgba(96,0,202,0.6)] sm:min-h-[420px] lg:min-h-[480px]">
                    <iframe
                        title="Mapa con la ubicación de las oficinas de Chisperío"
                        src={MAP_EMBED_URL}
                        className="absolute inset-0 h-full w-full border-0 [filter:grayscale(1)_contrast(1.05)] transition-[filter] duration-500 group-hover:[filter:grayscale(0)] group-active:[filter:grayscale(0)]"
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                    />
                </div>
            </div>
        </section>
    );
}
