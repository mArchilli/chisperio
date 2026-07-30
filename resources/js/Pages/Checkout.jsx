import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { useCart } from '@/Context/CartContext';
import LandingHeader from '@/Components/Landing/LandingHeader';
import LandingFooter from '@/Components/Landing/LandingFooter';

// Reemplazar con el número de WhatsApp del negocio (formato internacional sin +)
const WHATSAPP_NUMBER = '5491133973222';

const PROVINCIAS = [
    'Buenos Aires',
    'Ciudad Autónoma de Buenos Aires',
    'Catamarca',
    'Chaco',
    'Chubut',
    'Córdoba',
    'Corrientes',
    'Entre Ríos',
    'Formosa',
    'Jujuy',
    'La Pampa',
    'La Rioja',
    'Mendoza',
    'Misiones',
    'Neuquén',
    'Río Negro',
    'Salta',
    'San Juan',
    'San Luis',
    'Santa Cruz',
    'Santa Fe',
    'Santiago del Estero',
    'Tierra del Fuego',
    'Tucumán',
];

const formatPrice = (price) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);

const inputBase =
    'h-[3.25rem] w-full rounded-2xl border bg-[#fcfbfd] px-4 text-sm font-medium text-[#1c1b1b] placeholder:font-normal placeholder:text-[#b8afc0] transition-all focus:border-[#6000ca] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#6000ca]/10';

function ArrowIcon({ className = 'h-4 w-4' }) {
    return (
        <svg
            className={className}
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

function FormField({ label, required, error, children }) {
    return (
        <div>
            <label className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#4b4356]">
                {label}
                {required && <span className="ml-1 text-[#FF00D4]">*</span>}
            </label>
            {children}
            {error && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#ba1a1a]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#ba1a1a]" aria-hidden="true" />
                    {error}
                </p>
            )}
        </div>
    );
}

/* ─── Resumen lateral ──────────────────────────────────────────────────────── */
function CheckoutSummary({ items, subtotal }) {
    return (
        <aside className="relative overflow-hidden rounded-[2rem] border border-black/[0.06] bg-white p-5 shadow-[0_24px_55px_-38px_rgba(28,27,27,0.55)] sm:p-6 lg:p-7">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full border-[36px] border-[#6000ca]/[0.035]" />
            <p className="relative mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#6000ca]">
                Tu compra
            </p>
            <h2 className="relative mb-6 text-2xl font-black leading-tight tracking-tight text-[#1c1b1b] lg:text-[2rem]">
                Resumen
            </h2>

            <div className="relative mb-6 space-y-3">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-[1.25rem] border border-black/[0.05] bg-[#fcfbfd] p-2.5">
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border border-black/[0.05] bg-[#f6f3f8]">
                            {item.imagen ? (
                                <img
                                    src={`/${item.imagen}`}
                                    alt={item.titulo}
                                    className="h-full w-full object-contain p-2 mix-blend-multiply"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <span className="flex h-9 w-9 select-none items-center justify-center rounded-full border border-[#6000ca]/10 bg-white/75 text-lg font-black text-[#6000ca]/20">
                                        {item.titulo?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-xs font-extrabold leading-snug text-[#1c1b1b]">
                                {item.titulo}
                            </p>
                            <p className="mt-1 text-[10px] font-medium text-[#81788a]">
                                {item.cantidad} × {formatPrice(item.precio_display)}
                            </p>
                        </div>
                        <span className="flex-shrink-0 text-xs font-black text-[#6000ca]">
                            {formatPrice(item.precio_display * item.cantidad)}
                        </span>
                    </div>
                ))}
            </div>

            <div className="relative mb-5 rounded-[1.5rem] border border-[#6000ca]/10 bg-[#f7f4fa] p-5">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#4b4356]">Total del pedido</p>
                    </div>
                    <span className="text-[clamp(1.8rem,7vw,2.35rem)] font-black leading-none tracking-[-0.04em] text-[#6000ca]">
                        {formatPrice(subtotal)}
                    </span>
                </div>
            </div>

            <Link
                href={route('carrito.index')}
                className="relative flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#6000ca] bg-white px-5 py-3 text-xs font-extrabold uppercase tracking-[0.07em] text-[#6000ca] transition-all hover:bg-[#6000ca] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-[0.98]"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m5 5-5-5 5-5" />
                </svg>
                Volver al carrito
            </Link>
        </aside>
    );
}

/* ─── Página principal ─────────────────────────────────────────────────────── */
export default function Checkout({ canLogin }) {
    const { items, subtotal, clearCart } = useCart();

    const [form, setForm] = useState({
        nombre: '',
        apellido: '',
        dni: '',
        provincia: '',
        direccion: '',
        numero: '',
        entreCalles: '',
        codigoPostal: '',
        telefono: '',
        email: '',
        observaciones: '',
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState(null);

    const update = (field) => (e) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const validate = () => {
        const e = {};
        if (!form.nombre.trim()) e.nombre = 'El nombre es requerido';
        if (!form.apellido.trim()) e.apellido = 'El apellido es requerido';
        if (!form.dni.trim()) e.dni = 'El DNI es requerido';
        if (!form.provincia) e.provincia = 'Seleccioná una provincia';
        if (!form.direccion.trim()) e.direccion = 'La dirección es requerida';
        if (!form.numero.trim()) e.numero = 'El número es requerido';
        if (!form.codigoPostal.trim()) e.codigoPostal = 'El código postal es requerido';
        if (!form.telefono.trim()) e.telefono = 'El teléfono es requerido';
        if (!form.email.trim()) {
            e.email = 'El correo electrónico es requerido';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            e.email = 'Ingresá un correo válido';
        }
        return e;
    };

    const buildMessage = () =>
        [
            '🛒 *Nuevo pedido — Chisperío*',
            '',
            '📦 *Productos:*',
            ...items.map(
                (item) =>
                    `• ${item.titulo} x${item.cantidad} — ${formatPrice(item.precio_display * item.cantidad)}`
            ),
            '',
            `*Total: ${formatPrice(subtotal)} ARS*`,
            '',
            '📋 *Datos del cliente:*',
            `Nombre: ${form.nombre} ${form.apellido}`,
            `DNI: ${form.dni}`,
            `Provincia: ${form.provincia}`,
            `Dirección: ${form.direccion} ${form.numero}`,
            form.entreCalles ? `Entre calles: ${form.entreCalles}` : null,
            `Código Postal: ${form.codigoPostal}`,
            `Teléfono: ${form.telefono}`,
            `Email: ${form.email}`,
            form.observaciones ? `\n📝 *Observaciones:* ${form.observaciones}` : null,
        ]
            .filter(Boolean)
            .join('\n');

    const openWhatsApp = (message) => {
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );
        const encoded = encodeURIComponent(message);
        if (isMobile) {
            window.location.href = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${encoded}`;
        } else {
            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`, '_blank');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            const firstError = document.querySelector('[data-field-error]');
            firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        if (items.length === 0) return;
        setErrors({});
        setApiError(null);

        const message = buildMessage();

        setIsSubmitting(true);
        try {
            await axios.post(route('checkout.store'), {
                cliente_nombre: `${form.nombre} ${form.apellido}`.trim(),
                cliente_dni: form.dni,
                cliente_telefono: form.telefono,
                cliente_email: form.email,
                cliente_provincia: form.provincia,
                cliente_direccion: [
                    `${form.direccion} ${form.numero}`.trim(),
                    form.entreCalles ? `(entre calles: ${form.entreCalles})` : null,
                ]
                    .filter(Boolean)
                    .join(', '),
                cliente_codigo_postal: form.codigoPostal,
                observaciones: form.observaciones,
                items: items.map((item) => ({
                    producto_id: item.id,
                    cantidad: item.cantidad,
                })),
            });
        } catch (error) {
            setIsSubmitting(false);
            setApiError(
                'No pudimos registrar tu pedido. Por favor, intentá de nuevo en unos instantes.'
            );
            return;
        }

        sessionStorage.setItem('chisperio_last_order', message);
        openWhatsApp(message);
        clearCart();
        router.visit(route('confirmacion.index'));
    };

    const ic = (field) =>
        `${inputBase} ${errors[field] ? 'border-[#ba1a1a] bg-red-50/40' : 'border-black/[0.08]'}`;

    return (
        <div className="min-h-screen overflow-hidden bg-[#fcf9f8] text-[#1c1b1b] antialiased">
            <Head title="Finalizar pedido — Chisperío" />
            <LandingHeader canLogin={canLogin} />

            <main className="relative pb-28 md:pb-24">
                <div className="pointer-events-none absolute -left-52 top-16 h-[30rem] w-[30rem] rounded-full bg-[#6000ca]/[0.035] blur-3xl" />
                <div className="pointer-events-none absolute -right-40 top-[36rem] h-[26rem] w-[26rem] rounded-full bg-[#FF00D4]/[0.025] blur-3xl" />

                <div className="relative w-full px-3 pt-8 sm:px-4 md:pt-12">
                <header className="mb-8 flex flex-col gap-6 md:mb-12 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#6000ca]">
                            Último paso
                        </p>
                        <h1 className="text-[clamp(2.5rem,10vw,5.25rem)] font-black uppercase leading-[0.92] tracking-[-0.055em] text-[#1c1b1b]">
                            Finalizá tu <span className="text-[#6000ca]">pedido</span>
                        </h1>
                        <p className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-[#4b4356] md:text-base">
                            Completá tus datos para que podamos registrar tu compra y coordinar los próximos pasos por WhatsApp.
                        </p>
                    </div>

                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
                        <Link
                            href={route('carrito.index')}
                            className="inline-flex h-11 flex-shrink-0 items-center gap-2 rounded-full border border-[#6000ca]/15 bg-white px-4 text-[10px] font-extrabold uppercase tracking-[0.07em] text-[#6000ca] shadow-sm transition-all hover:border-[#6000ca] hover:bg-[#6000ca] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25} aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m5 5-5-5 5-5" />
                            </svg>
                            Volver al carrito
                        </Link>

                        <nav aria-label="Progreso de compra" className="flex items-center rounded-full border border-black/[0.06] bg-white p-1.5 shadow-sm">
                            <span className="px-3 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#6000ca]">
                                1. Carrito
                            </span>
                            <span className="flex h-8 items-center rounded-full bg-[#6000ca] px-3 text-[9px] font-extrabold uppercase tracking-[0.08em] text-white">
                                2. Datos
                            </span>
                            <span className="px-3 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#81788a]">
                                3. Confirmación
                            </span>
                        </nav>
                    </div>
                </header>

                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8 xl:gap-10">

                    {/* ── Formulario ── */}
                    <div className="order-2 lg:order-1 lg:col-span-8">
                        <form onSubmit={handleSubmit} noValidate aria-label="Datos para finalizar el pedido">
                            <div className="rounded-[2rem] border border-black/[0.06] bg-white p-5 shadow-[0_24px_55px_-40px_rgba(28,27,27,0.5)] sm:p-6 md:p-8 lg:p-9">

                                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#6000ca]">
                                    Información para tu pedido
                                </p>
                                <h2 className="mb-2 text-2xl font-black leading-tight tracking-tight text-[#1c1b1b] md:text-[2rem]">
                                    Datos personales
                                </h2>
                                <p className="mb-7 text-sm font-medium leading-relaxed text-[#81788a]">
                                    Usaremos esta información únicamente para registrar y coordinar tu compra.
                                </p>

                                {/* Nombre / Apellido / DNI */}
                                <div className="mb-7 grid grid-cols-1 gap-5 sm:grid-cols-3">
                                    <div data-field-error={errors.nombre ? 'true' : undefined}>
                                        <FormField label="Nombre" required error={errors.nombre}>
                                            <input
                                                type="text"
                                                placeholder="Tu nombre"
                                                value={form.nombre}
                                                onChange={update('nombre')}
                                                className={ic('nombre')}
                                            />
                                        </FormField>
                                    </div>
                                    <FormField label="Apellido" required error={errors.apellido}>
                                        <input
                                            type="text"
                                            placeholder="Tu apellido"
                                            value={form.apellido}
                                            onChange={update('apellido')}
                                            className={ic('apellido')}
                                        />
                                    </FormField>
                                    <FormField label="DNI" required error={errors.dni}>
                                        <input
                                            type="text"
                                            placeholder="12345678"
                                            value={form.dni}
                                            onChange={update('dni')}
                                            className={ic('dni')}
                                        />
                                    </FormField>
                                </div>

                                <div className="mb-6 border-t border-black/[0.06] pt-7">
                                    <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#6000ca]">
                                        Entrega y contacto
                                    </p>
                                    <h3 className="text-xl font-black leading-tight tracking-tight text-[#1c1b1b]">
                                        ¿Dónde te encontramos?
                                    </h3>
                                </div>

                                {/* Provincia */}
                                <div className="mb-5">
                                    <FormField label="Provincia" required error={errors.provincia}>
                                        <select
                                            value={form.provincia}
                                            onChange={update('provincia')}
                                            className={`${ic('provincia')} cursor-pointer`}
                                        >
                                            <option value="" disabled>
                                                Seleccioná una provincia
                                            </option>
                                            {PROVINCIAS.map((p) => (
                                                <option key={p} value={p}>
                                                    {p}
                                                </option>
                                            ))}
                                        </select>
                                    </FormField>
                                </div>

                                {/* Dirección / Número */}
                                <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
                                    <div className="sm:col-span-2">
                                        <FormField label="Dirección" required error={errors.direccion}>
                                            <input
                                                type="text"
                                                placeholder="Nombre de la calle"
                                                value={form.direccion}
                                                onChange={update('direccion')}
                                                className={ic('direccion')}
                                            />
                                        </FormField>
                                    </div>
                                    <FormField label="Número/Altura" required error={errors.numero}>
                                        <input
                                            type="text"
                                            placeholder="1234"
                                            value={form.numero}
                                            onChange={update('numero')}
                                            className={ic('numero')}
                                        />
                                    </FormField>
                                </div>

                                {/* Entre calles / Código Postal */}
                                <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <FormField label="Entre calles (opcional)">
                                        <input
                                            type="text"
                                            placeholder="Ej: Entre Av. Corrientes y Sarmiento"
                                            value={form.entreCalles}
                                            onChange={update('entreCalles')}
                                            className={`${inputBase} border-black/[0.08]`}
                                        />
                                    </FormField>
                                    <FormField label="Código Postal" required error={errors.codigoPostal}>
                                        <input
                                            type="text"
                                            placeholder="1234"
                                            value={form.codigoPostal}
                                            onChange={update('codigoPostal')}
                                            className={ic('codigoPostal')}
                                        />
                                    </FormField>
                                </div>

                                {/* Teléfono / Email */}
                                <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <FormField label="Teléfono" required error={errors.telefono}>
                                        <input
                                            type="tel"
                                            placeholder="+54 11 1234-5678"
                                            value={form.telefono}
                                            onChange={update('telefono')}
                                            className={ic('telefono')}
                                        />
                                    </FormField>
                                    <FormField label="Correo Electrónico" required error={errors.email}>
                                        <input
                                            type="email"
                                            placeholder="tu@email.com"
                                            value={form.email}
                                            onChange={update('email')}
                                            className={ic('email')}
                                        />
                                    </FormField>
                                </div>

                                {/* Observaciones */}
                                <div className="mb-7 border-t border-black/[0.06] pt-7">
                                    <p className="mb-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#6000ca]">
                                        Información adicional
                                    </p>
                                    <FormField label="Observaciones (opcional)">
                                        <textarea
                                            placeholder="Agrega cualquier comentario adicional sobre tu pedido (horarios de entrega preferidos, instrucciones especiales, etc.)"
                                            value={form.observaciones}
                                            onChange={update('observaciones')}
                                            rows={4}
                                            className={`${inputBase} h-auto min-h-[7.5rem] resize-none border-black/[0.08] py-3.5`}
                                        />
                                    </FormField>
                                </div>

                                {/* Nota legal */}
                                <div className="mb-6 flex items-start gap-3 rounded-[1.25rem] border border-[#6000ca]/10 bg-[#6000ca]/[0.045] p-4 text-xs font-medium leading-relaxed text-[#4b4356]">
                                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-[#6000ca] shadow-sm" aria-hidden="true">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </span>
                                    <p>
                                        Tu carrito y tus datos se van a enviar en forma de mensaje de{' '}
                                        <span className="font-extrabold text-[#6000ca]">WhatsApp</span>
                                        , para que nuestro personal te atienda y puedas finalizar tu compra.
                                    </p>
                                </div>

                                {/* Error de envío */}
                                {apiError && (
                                    <p role="alert" className="mb-4 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-[#ba1a1a]">
                                        {apiError}
                                    </p>
                                )}

                                {/* Botón submit */}
                                <button
                                    type="submit"
                                    disabled={items.length === 0 || isSubmitting}
                                    className="flex h-14 w-full items-center justify-center gap-3 rounded-full bg-[#6000ca] px-6 text-xs font-extrabold uppercase tracking-[0.07em] text-white shadow-[0_14px_28px_-14px_rgba(96,0,202,0.85)] transition-all hover:bg-[#4f00a8] hover:shadow-[0_18px_34px_-15px_rgba(96,0,202,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 motion-reduce:transform-none"
                                >
                                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                    {isSubmitting ? 'Enviando pedido…' : 'Enviar pedido por WhatsApp'}
                                    {!isSubmitting && <ArrowIcon />}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* ── Resumen ── */}
                    <div className="order-1 lg:order-2 lg:col-span-4">
                        <div className="lg:sticky lg:top-28">
                            <CheckoutSummary items={items} subtotal={subtotal} />
                        </div>
                    </div>

                </div>
                </div>
            </main>

            <LandingFooter />
        </div>
    );
}
