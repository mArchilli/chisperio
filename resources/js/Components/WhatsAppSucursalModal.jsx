import {
    Dialog,
    DialogPanel,
    DialogTitle,
    Transition,
    TransitionChild,
} from '@headlessui/react';
import { WHATSAPP_SUCURSALES, abrirWhatsApp } from '@/lib/whatsapp';

function WhatsAppIcon({ className = '' }) {
    return (
        <svg viewBox="0 0 32 32" className={`fill-current ${className}`} aria-hidden="true">
            <path d="M16.003 2.667C8.636 2.667 2.667 8.636 2.667 16c0 2.354.617 4.562 1.693 6.476L2.667 29.333l7.061-1.852A13.267 13.267 0 0016.003 29.333C23.369 29.333 29.333 23.369 29.333 16S23.369 2.667 16.003 2.667zm0 24.267a11.12 11.12 0 01-5.667-1.553l-.406-.24-4.19 1.099 1.12-4.086-.265-.42A11.12 11.12 0 014.882 16c0-6.135 4.992-11.12 11.12-11.12S27.12 9.865 27.12 16s-4.986 10.934-11.117 10.934zm6.1-8.294c-.334-.167-1.974-.974-2.28-1.085-.306-.112-.53-.167-.752.167-.224.334-.865 1.085-1.06 1.308-.194.224-.39.251-.723.084-.334-.167-1.408-.52-2.682-1.657-.991-.886-1.66-1.98-1.854-2.314-.194-.334-.021-.514.146-.68.15-.149.334-.39.501-.585.167-.195.224-.334.334-.557.112-.224.056-.419-.028-.585-.084-.167-.752-1.813-1.03-2.481-.272-.651-.548-.563-.752-.574-.194-.01-.419-.012-.64-.012-.224 0-.585.084-.89.418-.306.334-1.168 1.14-1.168 2.782s1.196 3.228 1.362 3.451c.167.224 2.354 3.595 5.705 5.044.797.344 1.419.55 1.904.703.8.255 1.53.219 2.106.133.642-.096 1.974-.807 2.252-1.587.278-.78.278-1.45.195-1.587-.083-.14-.306-.224-.64-.39z" />
        </svg>
    );
}

/**
 * Modal de selección de sucursal para WhatsApp. Vive una sola vez a nivel de app
 * (ver WhatsAppSucursalProvider) y lo abre cualquier botón de WhatsApp del sitio
 * con `abrirSelectorWhatsApp(mensaje)`. Al elegir una sucursal, arma la URL con
 * su número y el mensaje recibido, y cierra.
 */
export default function WhatsAppSucursalModal({ abierto, mensaje, onClose }) {
    const elegirSucursal = (sucursal) => {
        abrirWhatsApp(sucursal.numero, mensaje);
        onClose();
    };

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
                                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366]/10 text-[#1ebe5c]">
                                    <WhatsAppIcon className="h-6 w-6" />
                                </span>
                                <div>
                                    <DialogTitle className="text-lg font-black uppercase leading-tight tracking-tight text-[#1c1b1b]">
                                        Elegí una sucursal
                                    </DialogTitle>
                                    <p className="mt-0.5 text-xs font-medium text-[#81788a]">
                                        Te conectamos con el equipo de la sucursal que elijas.
                                    </p>
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
                            {WHATSAPP_SUCURSALES.map((sucursal) => (
                                <button
                                    key={sucursal.id}
                                    type="button"
                                    onClick={() => elegirSucursal(sucursal)}
                                    className="group flex w-full items-center gap-4 rounded-2xl border border-black/[0.08] bg-[#fcfbfd] p-4 text-left transition-all hover:border-[#25D366] hover:bg-[#25D366]/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 active:scale-[0.99]"
                                >
                                    <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm">
                                        <WhatsAppIcon className="h-6 w-6" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-black uppercase tracking-tight text-[#1c1b1b]">
                                            {sucursal.nombre}
                                        </span>
                                        <span className="block text-xs font-medium text-[#81788a]">
                                            {sucursal.telefonoLegible}
                                        </span>
                                    </span>
                                    <svg
                                        className="h-4 w-4 flex-shrink-0 text-[#81788a] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1ebe5c]"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2.25}
                                        aria-hidden="true"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
                                    </svg>
                                </button>
                            ))}
                        </div>
                    </DialogPanel>
                </TransitionChild>
            </Dialog>
        </Transition>
    );
}
