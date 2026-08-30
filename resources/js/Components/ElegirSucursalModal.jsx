import {
    Dialog,
    DialogPanel,
    DialogTitle,
    Transition,
    TransitionChild,
} from '@headlessui/react';

/**
 * Modal genérico "elegí una sucursal" para redes con una cuenta por ciudad
 * (hoy: Instagram, en la sección de contacto). Cada opción es un link externo.
 * Espeja el estilo de WhatsAppSucursalModal; a diferencia de ese, no vive a
 * nivel de app — lo controla con estado local quien lo use.
 *
 * `opciones`: [{ id, nombre, detalle?, href }]
 */
function ArrowIcon() {
    return (
        <svg
            className="h-4 w-4 flex-shrink-0 text-[#81788a] transition-transform group-hover:translate-x-0.5 group-hover:text-[#6000ca]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.25}
            aria-hidden="true"
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
        </svg>
    );
}

export default function ElegirSucursalModal({ abierto, onClose, titulo, subtitulo, icono: Icono, opciones }) {
    return (
        <Transition show={abierto} leave="duration-200">
            <Dialog
                as="div"
                className="fixed inset-0 z-[75] flex transform items-center overflow-y-auto px-4 py-6 transition-all sm:px-0"
                onClose={onClose}
            >
                <TransitionChild
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="absolute inset-0 bg-[#1c1b1b]/60 backdrop-blur-sm" />
                </TransitionChild>

                <TransitionChild
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                >
                    <DialogPanel className="relative z-10 mb-6 w-full transform overflow-hidden rounded-[1.75rem] bg-white p-6 shadow-2xl transition-all sm:mx-auto sm:max-w-md sm:p-8">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#6000ca]/10 text-[#6000ca]">
                                    {Icono ? <Icono className="h-6 w-6" /> : null}
                                </span>
                                <div>
                                    <DialogTitle className="text-lg font-black uppercase leading-tight tracking-tight text-[#1c1b1b]">
                                        {titulo}
                                    </DialogTitle>
                                    {subtitulo && (
                                        <p className="mt-0.5 text-xs font-medium text-[#81788a]">{subtitulo}</p>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Cerrar"
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="mt-6 space-y-3">
                            {opciones.map((opcion) => (
                                <a
                                    key={opcion.id}
                                    href={opcion.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={onClose}
                                    className="group flex w-full items-center gap-4 rounded-2xl border border-black/[0.08] bg-[#fcfbfd] p-4 text-left transition-all hover:border-[#6000ca] hover:bg-[#6000ca]/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-[0.99]"
                                >
                                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#6000ca] text-white shadow-sm">
                                        {Icono ? <Icono className="h-6 w-6" /> : null}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-black uppercase tracking-tight text-[#1c1b1b]">
                                            {opcion.nombre}
                                        </span>
                                        {opcion.detalle && (
                                            <span className="block truncate text-xs font-medium text-[#81788a]">
                                                {opcion.detalle}
                                            </span>
                                        )}
                                    </span>
                                    <ArrowIcon />
                                </a>
                            ))}
                        </div>
                    </DialogPanel>
                </TransitionChild>
            </Dialog>
        </Transition>
    );
}
