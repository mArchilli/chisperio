const MACHINES = [
    'Bastón de Mano Chispas Frías',
    'Lanzallama Escénico Profesional',
    'Máquina de Humo DMX 1500W',
    'Detonador Inalámbrico Pro',
    'Pistola Tira Chispa',
];

const RENTAL_MESSAGE = '¡Hola! Quiero consultar por el alquiler de maquinaria para mi evento.';
const RENTAL_WHATSAPP_URL = `https://wa.me/5491133973222?text=${encodeURIComponent(RENTAL_MESSAGE)}`;

function ArrowIcon() {
    return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
        </svg>
    );
}

function TruckIcon() {
    return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6.75A1.75 1.75 0 014.75 5h8.5A1.75 1.75 0 0115 6.75V17H3V6.75z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h2.8a2 2 0 011.6.8L21 12v5h-6V9zM6.5 20a2 2 0 100-4 2 2 0 000 4zm11 0a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
    );
}

function SparkIcon() {
    return (
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10 1.75c.35 0 .65.24.73.58l.62 2.63a4.75 4.75 0 003.54 3.54l2.63.62a.75.75 0 010 1.46l-2.63.62a4.75 4.75 0 00-3.54 3.54l-.62 2.63a.75.75 0 01-1.46 0l-.62-2.63a4.75 4.75 0 00-3.54-3.54l-2.63-.62a.75.75 0 010-1.46l2.63-.62a4.75 4.75 0 003.54-3.54l.62-2.63a.75.75 0 01.73-.58z" />
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

export default function RentalMachine() {
    return (
        <section
            id="alquiler"
            aria-labelledby="rental-machine-title"
            className="mb-16 w-full scroll-mt-32 px-6 md:mb-20 md:px-10 lg:px-12 xl:px-16"
        >
            <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-5xl">
                    <h2
                        id="rental-machine-title"
                        className="text-[2.5rem] font-black uppercase leading-[0.96] tracking-tight text-[#1c1b1b] md:text-[3.25rem] lg:text-[clamp(3rem,4.4vw,4.75rem)]"
                    >
                        Alquiler de <span className="text-[#6000ca]">maquinaria</span>
                    </h2>
                    <p className="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-[#4b4356] md:text-base">
                        Maquinaria profesional para tu evento, con envíos coordinados a todo el país.
                    </p>
                </div>

                <div className="inline-flex w-fit items-center gap-3 rounded-full border border-[#6000ca]/15 bg-white px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.08em] text-[#6000ca] shadow-sm">
                    <TruckIcon />
                    Cobertura nacional
                </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-black/[0.06] bg-white shadow-[0_18px_45px_-30px_rgba(28,27,27,0.45)]">
                <div className="relative overflow-hidden bg-[#f6f3f8]">
                    <img
                        src="/images/rentalmachine-img.png"
                        alt="Equipos Chisperío disponibles para alquiler de maquinaria para eventos"
                        width="1961"
                        height="802"
                        className="block h-auto w-full"
                        loading="lazy"
                        decoding="async"
                    />

                    <div className="absolute right-4 top-4 rounded-full border border-white/70 bg-white/90 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#6000ca] shadow-md backdrop-blur-sm md:right-6 md:top-6 md:text-xs">
                        Equipos profesionales
                    </div>
                </div>

                <div className="grid lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
                    <div className="flex flex-col items-start bg-[#6000ca] p-7 text-white md:p-10 lg:p-12">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/70 md:text-xs">
                            Servicio para eventos
                        </span>
                        <h3 className="mt-4 max-w-xl text-3xl font-black uppercase leading-[0.98] tracking-tight md:text-[2.5rem]">
                            El efecto que imaginás, listo para usar.
                        </h3>
                        <p className="mt-5 max-w-xl text-sm font-medium leading-relaxed text-white/80 md:text-base">
                            Alquilamos maquinaria para tu evento y te ayudamos a elegir el equipo ideal según el espacio, el momento y el tipo de celebración.
                        </p>

                        <div className="mt-7 flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold leading-relaxed text-white/90">
                            <span className="mt-0.5 flex-shrink-0"><TruckIcon /></span>
                            Coordinamos envíos a todo el país para que el equipo llegue donde lo necesitás.
                        </div>

                        <a
                            href={RENTAL_WHATSAPP_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-7 inline-flex items-center gap-2.5 rounded-full bg-white px-6 py-3.5 text-xs font-extrabold uppercase tracking-[0.08em] text-[#6000ca] shadow-lg transition-all hover:bg-[#1c1b1b] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#6000ca] active:scale-95 md:px-7"
                        >
                            <WhatsAppIcon />
                            Consultar alquiler
                            <ArrowIcon />
                        </a>
                    </div>

                    <div className="p-7 md:p-10 lg:p-12">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#6000ca] md:text-xs">
                                    Nuestro equipamiento
                                </span>
                                <h3 className="mt-2 text-2xl font-black uppercase leading-tight text-[#1c1b1b] md:text-3xl">
                                    Maquinaria disponible
                                </h3>
                            </div>
                            <p className="text-xs font-medium text-[#4b4356]">Sujeto a disponibilidad.</p>
                        </div>

                        <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                            {MACHINES.map((machine, index) => (
                                <li
                                    key={machine}
                                    className={`group flex min-h-[4.5rem] items-center gap-3 rounded-2xl border border-black/[0.06] bg-[#fcf9f8] px-4 py-3.5 transition-all hover:-translate-y-0.5 hover:border-[#6000ca]/25 hover:shadow-sm ${
                                        index === MACHINES.length - 1 ? 'sm:col-span-2' : ''
                                    }`}
                                >
                                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#6000ca] text-white transition-transform group-hover:rotate-12">
                                        <SparkIcon />
                                    </span>
                                    <span className="text-sm font-bold leading-snug text-[#1c1b1b]">
                                        {machine}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-6 flex items-center justify-between gap-4 border-t border-black/[0.06] pt-5">
                            <p className="max-w-md text-xs font-medium leading-relaxed text-[#4b4356]">
                                Contanos la fecha, la ciudad y el tipo de evento para recomendarte la mejor opción.
                            </p>
                            <a
                                href={RENTAL_WHATSAPP_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[#6000ca]/20 bg-white text-[#6000ca] transition-all hover:border-[#6000ca] hover:bg-[#6000ca] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95"
                                aria-label="Consultar disponibilidad por WhatsApp"
                            >
                                <ArrowIcon />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
