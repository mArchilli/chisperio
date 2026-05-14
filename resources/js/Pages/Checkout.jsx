import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
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
    'w-full px-4 py-2.5 rounded-xl border text-sm text-[#1c1b1b] placeholder:text-[#c4bfca] bg-white focus:outline-none focus:ring-2 focus:ring-[#6000ca]/30 focus:border-[#6000ca] transition-colors';

function FormField({ label, required, error, children }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-[#6000ca] mb-1.5 tracking-wide uppercase">
                {label}
                {required && <span className="text-[#d700b2] ml-0.5">*</span>}
            </label>
            {children}
            {error && <p className="mt-1 text-xs text-[#ba1a1a]">{error}</p>}
        </div>
    );
}

/* ─── Resumen lateral ──────────────────────────────────────────────────────── */
function CheckoutSummary({ items, subtotal }) {
    return (
        <div className="bg-white border border-[#e5e2e1] rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-lg text-[#1c1b1b] mb-5">
                Resumen del pedido.
            </h2>

            <div className="space-y-4 mb-5">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                        <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-[#f6f3f2] border border-[#e5e2e1]">
                            {item.imagen ? (
                                <img
                                    src={`/${item.imagen}`}
                                    alt={item.titulo}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-lg font-black text-[#6000ca]/20 select-none">
                                        {item.titulo?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#1c1b1b] leading-snug line-clamp-2">
                                {item.titulo}
                            </p>
                            <p className="text-xs text-[#7c7388] mt-0.5">
                                {item.cantidad} × {formatPrice(item.precio_display)}
                            </p>
                        </div>
                        <span className="text-sm font-bold text-[#1c1b1b] flex-shrink-0">
                            {formatPrice(item.precio_display * item.cantidad)}
                        </span>
                    </div>
                ))}
            </div>

            <div className="border-t border-[#e5e2e1] pt-4 mb-5">
                <div className="flex justify-between items-center">
                    <span className="font-bold text-base text-[#1c1b1b]">Total</span>
                    <span className="font-black text-xl text-[#7d12ff]">
                        {formatPrice(subtotal)}{' '}
                        <span className="text-sm font-semibold text-[#7c7388]">ARS</span>
                    </span>
                </div>
            </div>

            <Link
                href={route('carrito.index')}
                className="w-full border-2 border-[#6000ca] text-[#6000ca] font-bold py-3 rounded-xl flex items-center justify-center text-sm active:scale-95 transition-all hover:bg-purple-50"
            >
                Volver al carrito
            </Link>
        </div>
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

    const handleSubmit = (e) => {
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

        const message = buildMessage();
        sessionStorage.setItem('chisperio_last_order', message);

        openWhatsApp(message);
        clearCart();
        router.visit(route('confirmacion.index'));
    };

    const ic = (field) =>
        `${inputBase} ${errors[field] ? 'border-[#ba1a1a] bg-red-50/40' : 'border-[#e5e2e1]'}`;

    return (
        <div
            className="bg-[#fcf9f8] min-h-screen text-[#1c1b1b] antialiased"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
            <Head title="Finalizar pedido — Chisperío" />
            <LandingHeader canLogin={canLogin} />

            <main className="max-w-[1280px] mx-auto px-4 md:px-8 pt-6 md:pt-12 pb-28 md:pb-24">

                {/* Header de página */}
                <div className="flex items-start justify-between mb-8 md:mb-12 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-[48px] font-extrabold md:font-black text-[#1c1b1b] leading-tight tracking-tight">
                            Finalizar pedido.
                        </h1>
                        <p className="text-sm md:text-base text-[#7c7388] mt-1">
                            Completa tus datos para confirmar el pedido.
                        </p>
                    </div>
                    <Link
                        href={route('carrito.index')}
                        className="flex-shrink-0 flex items-center gap-1.5 text-sm font-semibold text-[#6000ca] border border-[#6000ca]/40 px-4 py-2 rounded-xl hover:bg-purple-50 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Volver al carrito
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">

                    {/* ── Formulario ── */}
                    <div className="lg:col-span-8 order-2 lg:order-1">
                        <form onSubmit={handleSubmit} noValidate>
                            <div className="bg-white border border-[#e5e2e1] rounded-2xl p-6 md:p-8 shadow-sm">

                                <h2 className="font-bold text-base md:text-lg text-[#1c1b1b] mb-6">
                                    Datos de contacto y entrega.
                                </h2>

                                {/* Nombre / Apellido / DNI */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
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

                                {/* Provincia */}
                                <div className="mb-4">
                                    <FormField label="Provincia" required error={errors.provincia}>
                                        <select
                                            value={form.provincia}
                                            onChange={update('provincia')}
                                            className={`${ic('provincia')} cursor-pointer`}
                                        >
                                            <option value="" disabled>
                                                Selecciona una provincia
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
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                    <FormField label="Entre calles (opcional)">
                                        <input
                                            type="text"
                                            placeholder="Ej: Entre Av. Corrientes y Sarmiento"
                                            value={form.entreCalles}
                                            onChange={update('entreCalles')}
                                            className={`${inputBase} border-[#e5e2e1]`}
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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
                                <div className="mb-6">
                                    <FormField label="Observaciones (opcional)">
                                        <textarea
                                            placeholder="Agrega cualquier comentario adicional sobre tu pedido (horarios de entrega preferidos, instrucciones especiales, etc.)"
                                            value={form.observaciones}
                                            onChange={update('observaciones')}
                                            rows={4}
                                            className={`${inputBase} border-[#e5e2e1] resize-none`}
                                        />
                                    </FormField>
                                </div>

                                {/* Nota legal */}
                                <p className="text-xs text-[#7c7388] mb-6 leading-relaxed">
                                    Tu carrito y tus datos se van a enviar en forma de mensaje de{' '}
                                    <span className="text-[#6000ca] font-semibold">WhatsApp</span>
                                    , para que nuestro personal te atienda y puedas finalizar tu compra.
                                </p>

                                {/* Botón submit */}
                                <button
                                    type="submit"
                                    disabled={items.length === 0}
                                    className="w-full flex items-center justify-center gap-3 bg-[#25D366] text-white font-bold py-4 rounded-xl hover:bg-[#1ebe5a] active:scale-95 transition-all shadow-lg shadow-green-500/20 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                                >
                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                    Enviar pedido por WhatsApp
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* ── Resumen ── */}
                    <div className="lg:col-span-4 order-1 lg:order-2">
                        <div className="lg:sticky lg:top-24">
                            <CheckoutSummary items={items} subtotal={subtotal} />
                        </div>
                    </div>

                </div>
            </main>

            <LandingFooter />
        </div>
    );
}
