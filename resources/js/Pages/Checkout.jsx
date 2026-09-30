import { useEffect, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useCart } from '@/Context/CartContext';
import LandingHeader from '@/Components/Landing/LandingHeader';
import LandingFooter from '@/Components/Landing/LandingFooter';
import BarraEnvioGratis from '@/Components/BarraEnvioGratis';
import CodigoDescuentoBlock from '@/Components/CodigoDescuentoBlock';
import FormaPagoBlock from '@/Components/FormaPagoBlock';
import {
    buildOrderMessage,
    abrirWhatsApp,
    getSucursal,
    sucursalSugeridaId,
    SUCURSAL_POR_DEFECTO_ID,
    WHATSAPP_SUCURSALES,
} from '@/lib/whatsapp';
import { itemsIncluidosCombo } from '@/lib/combo';

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
function CheckoutSummary({
    items,
    subtotal,
    codigoAplicado,
    descuentoInfo,
    montoDescuento,
    totalConDescuento,
    validandoCodigo,
    onAplicarCodigo,
    onQuitarCodigo,
    codigoDescuentoError,
    planesPagoTarjeta,
    formaPagoSeleccionada,
    onSeleccionarFormaPago,
    recargoFormaPago,
    totalFinal,
}) {
    return (
        <aside className="relative overflow-hidden rounded-[2rem] border border-black/[0.06] bg-white p-5 shadow-[0_24px_55px_-38px_rgba(28,27,27,0.55)] sm:p-6 lg:p-7">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full border-[36px] border-[#6000ca]/[0.035]" />
            <p className="relative mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#6000ca]">
                Tu compra
            </p>
            <h2 className="relative mb-6 text-2xl font-black leading-tight tracking-tight text-[#1c1b1b] lg:text-[2rem]">
                Resumen
            </h2>

            {/* OJO: el envío gratis se evalúa sobre el subtotal bruto, nunca sobre el
                total con descuento — mismo criterio que Carrito.jsx. */}
            <div className="relative mb-6">
                <BarraEnvioGratis subtotal={subtotal} />
            </div>

            <div className="relative">
                <CodigoDescuentoBlock
                    codigoAplicado={codigoAplicado}
                    descuentoInfo={descuentoInfo}
                    montoDescuento={montoDescuento}
                    validando={validandoCodigo}
                    onAplicar={onAplicarCodigo}
                    onQuitar={onQuitarCodigo}
                />
            </div>

            <div className="relative">
                <FormaPagoBlock
                    planes={planesPagoTarjeta}
                    seleccionado={formaPagoSeleccionada}
                    onSeleccionar={onSeleccionarFormaPago}
                />
            </div>

            <div className="relative mb-6 space-y-3">
                {items.map((item) => (
                    <div key={item.lineKey} className="flex items-center gap-3 rounded-[1.25rem] border border-black/[0.05] bg-[#fcfbfd] p-2.5">
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border border-black/[0.05] bg-white">
                            {item.imagen ? (
                                <img
                                    src={`/${item.imagen}`}
                                    alt={item.titulo}
                                    className="h-full w-full object-contain p-2"
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
                                {item.cantidad} × {formatPrice(item.precioUnitario)}
                            </p>
                        </div>
                        <span className="flex-shrink-0 text-xs font-black text-[#6000ca]">
                            {formatPrice(item.subtotalItem)}
                        </span>
                    </div>
                ))}
            </div>

            <div className="relative mb-5 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                    <span className="font-medium text-[#81788a]">Subtotal</span>
                    <span className="font-extrabold text-[#1c1b1b]">{formatPrice(subtotal)}</span>
                </div>
                {codigoAplicado && (
                    <div className="flex items-center justify-between gap-4">
                        <span className="font-medium text-[#81788a]">
                            Descuento <span className="text-[#4b4356]">({codigoAplicado})</span>
                        </span>
                        <span className="font-extrabold text-[#1c8a4c]">-{formatPrice(montoDescuento)}</span>
                    </div>
                )}
                {formaPagoSeleccionada && recargoFormaPago && (
                    <div className="flex items-center justify-between gap-4">
                        <span className="font-medium text-[#81788a]">
                            Recargo <span className="text-[#4b4356]">({formaPagoSeleccionada.nombre})</span>
                        </span>
                        <span className="font-extrabold text-[#1c1b1b]">+{formatPrice(recargoFormaPago.recargo_monto)}</span>
                    </div>
                )}
            </div>

            {codigoDescuentoError && (
                <div role="alert" className="relative mb-5 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-[#ba1a1a]">
                    {codigoDescuentoError}
                </div>
            )}

            <div className="relative mb-5 rounded-[1.5rem] border border-[#6000ca]/10 bg-[#f7f4fa] p-5">
                <div className="flex items-end justify-between gap-4">
                    <div>
                        <p className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#4b4356]">Total del pedido</p>
                    </div>
                    <span className="text-[clamp(1.8rem,7vw,2.35rem)] font-black leading-none tracking-[-0.04em] text-[#6000ca]">
                        {formatPrice(totalFinal)}
                    </span>
                </div>
                {formaPagoSeleccionada && recargoFormaPago && (
                    <p className="mt-2 text-right text-xs font-semibold text-[#4b4356]">
                        {formaPagoSeleccionada.cuotas === 1
                            ? `1 cuota de ${formatPrice(recargoFormaPago.monto_por_cuota)}`
                            : `${formaPagoSeleccionada.cuotas} cuotas de ${formatPrice(recargoFormaPago.monto_por_cuota)} c/u`}
                    </p>
                )}
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
    const {
        items,
        subtotal,
        clearCart,
        hayItemsSinStock,
        codigoAplicado,
        descuentoInfo,
        montoDescuento,
        totalConDescuento,
        validandoCodigo,
        aplicarCodigoDescuento,
        quitarCodigoDescuento,
        formaPagoSeleccionada,
        setFormaPago,
        recargoFormaPago,
        totalFinal,
    } = useCart();

    // Igual criterio que BarraEnvioGratis: montoMinimo <= 0 significa que la feature
    // está desactivada desde el admin, y el envío gratis se evalúa sobre el subtotal
    // bruto (nunca sobre el total con descuento).
    const { configuracionEnvio, planesPagoTarjeta } = usePage().props;
    const montoMinimoEnvioGratis = configuracionEnvio?.montoMinimo ?? 0;
    const envioGratisAlcanzado = montoMinimoEnvioGratis > 0 && subtotal >= montoMinimoEnvioGratis;

    const [form, setForm] = useState({
        nombre: '',
        apellido: '',
        dni: '',
        provincia: '',
        ciudad: '',
        codigoPostal: '',
        telefono: '',
        email: '',
        observaciones: '',
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [codigoDescuentoError, setCodigoDescuentoError] = useState(null);

    // Sucursal de WhatsApp con la que el cliente va a coordinar el pedido. Se
    // sugiere según la provincia elegida (ver sucursalSugeridaId), pero es
    // editable: una vez que el cliente la toca a mano, `sucursalEditada` queda
    // en true y la sugerencia por provincia deja de pisarla.
    const [sucursalId, setSucursalId] = useState(SUCURSAL_POR_DEFECTO_ID);
    const [sucursalEditada, setSucursalEditada] = useState(false);
    const idSucursalSugerida = sucursalSugeridaId(form.provincia);

    useEffect(() => {
        if (!sucursalEditada) setSucursalId(idSucursalSugerida);
    }, [idSucursalSugerida, sucursalEditada]);

    const elegirSucursal = (id) => {
        setSucursalId(id);
        setSucursalEditada(true);
    };

    const update = (field) => (e) =>
        setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const validate = () => {
        const e = {};
        if (!form.nombre.trim()) e.nombre = 'El nombre es requerido';
        if (!form.apellido.trim()) e.apellido = 'El apellido es requerido';
        if (!form.dni.trim()) e.dni = 'El DNI es requerido';
        if (!form.provincia) e.provincia = 'Seleccioná una provincia';
        if (!form.ciudad.trim()) e.ciudad = 'La ciudad es requerida';
        if (!form.codigoPostal.trim()) e.codigoPostal = 'El código postal es requerido';
        if (!form.telefono.trim()) e.telefono = 'El teléfono es requerido';
        if (!form.email.trim()) {
            e.email = 'El correo electrónico es requerido';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            e.email = 'Ingresá un correo válido';
        }
        return e;
    };

    // Shape compartido con ConfirmacionPedido.jsx (ver resources/js/lib/whatsapp.js):
    // se persiste tal cual en sessionStorage para poder reconstruir el mismo mensaje
    // desde la pantalla de confirmación sin duplicar el formato en dos lugares.
    const pedidoParaMensaje = () => ({
        cliente: {
            nombre: form.nombre,
            apellido: form.apellido,
            dni: form.dni,
            provincia: form.provincia,
            ciudad: form.ciudad,
            codigoPostal: form.codigoPostal,
            telefono: form.telefono,
            email: form.email,
        },
        observaciones: form.observaciones || null,
        items: items.map((item) =>
            item.tipo === 'combo'
                ? {
                      titulo: item.titulo,
                      cantidad: item.cantidad,
                      subtotalItem: item.subtotalItem,
                      componentes: itemsIncluidosCombo(item),
                      envioGratis: item.combo?.envio_gratis ?? false,
                  }
                : {
                      titulo: item.titulo,
                      cantidad: item.cantidad,
                      subtotalItem: item.subtotalItem,
                      variante: item.variante ? { nombre: item.variante.nombre } : null,
                      colorPersonalizadoTexto: item.colorPersonalizadoTexto || null,
                      addons: item.addons.map((addon) => ({
                          nombre: addon.nombre,
                          texto_personalizado: addon.texto_personalizado,
                      })),
                  }
        ),
        subtotal,
        codigoDescuento: codigoAplicado,
        montoDescuento,
        formaPago: formaPagoSeleccionada
            ? {
                  nombre: formaPagoSeleccionada.nombre,
                  cuotas: formaPagoSeleccionada.cuotas,
                  recargoPorcentaje: formaPagoSeleccionada.recargoPorcentaje,
                  recargoMonto: recargoFormaPago.recargo_monto,
                  montoPorCuota: recargoFormaPago.monto_por_cuota,
                  totalConRecargo: recargoFormaPago.total_con_recargo,
              }
            : null,
        total: totalFinal,
        envioGratis: { alcanzado: envioGratisAlcanzado, montoMinimo: montoMinimoEnvioGratis },
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            const firstError = document.querySelector('[data-field-error]');
            firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        if (items.length === 0 || hayItemsSinStock) return;
        setErrors({});
        setApiError(null);
        setCodigoDescuentoError(null);

        const pedido = pedidoParaMensaje();
        const message = buildOrderMessage(pedido);

        setIsSubmitting(true);
        try {
            await axios.post(route('checkout.store'), {
                cliente_nombre: `${form.nombre} ${form.apellido}`.trim(),
                cliente_dni: form.dni,
                cliente_telefono: form.telefono,
                cliente_email: form.email,
                cliente_provincia: form.provincia,
                cliente_ciudad: form.ciudad,
                cliente_codigo_postal: form.codigoPostal,
                observaciones: form.observaciones,
                sucursal: sucursalId,
                codigo_descuento: codigoAplicado,
                plan_pago_tarjeta_id: formaPagoSeleccionada?.planId ?? null,
                items: items
                    .filter((item) => item.tipo !== 'combo')
                    .map((item) => ({
                        producto_id: item.producto_id,
                        cantidad: item.cantidad,
                        variante_id: item.varianteId,
                        color_personalizado_texto: item.colorPersonalizadoTexto || null,
                        addons: item.addons.map((addon) => ({
                            addon_id: addon.addon_id,
                            texto_personalizado: addon.texto_personalizado,
                        })),
                    })),
                combos: items
                    .filter((item) => item.tipo === 'combo')
                    .map((item) => ({
                        combo_id: item.combo_id,
                        cantidad: item.cantidad,
                        selecciones: (item.selecciones || []).map((s) => ({
                            combo_producto_id: s.comboItemId,
                            variante_id: s.varianteId,
                        })),
                    })),
            });
        } catch (error) {
            setIsSubmitting(false);
            // El backend devuelve 422 con errors: {"stock.{producto_id}": ["mensaje"]} cuando
            // no alcanza el stock (chequeo optimista al armar el pedido, o la condición de
            // carrera real si cambió justo entre que el usuario armó el carrito y confirmó —
            // ver Fase 3/StockService). Mostramos ese mensaje específico en vez del genérico,
            // porque le dice al usuario exactamente qué producto ajustar y a cuánto.
            const erroresBackend = error.response?.data?.errors;
            const mensajesStock = erroresBackend
                ? Object.entries(erroresBackend)
                      .filter(([campo]) => campo.startsWith('stock.'))
                      .flatMap(([, mensajes]) => mensajes)
                : [];
            // El código pudo invalidarse (vencer, agotar su límite de usos) entre que se
            // aplicó en el carrito y que se confirmó el pedido — resolverParaCheckout()
            // lo revalida con lock y devuelve 422 sobre este campo (Fase 4). Se muestra
            // aparte, junto al resumen, en vez de mezclado con errores de stock.
            const mensajesCodigo = erroresBackend?.codigo_descuento ?? null;
            if (mensajesCodigo) {
                setCodigoDescuentoError(mensajesCodigo.join(' '));
            }

            setApiError(
                mensajesStock.length > 0
                    ? mensajesStock
                    : mensajesCodigo
                        ? null
                        : 'No pudimos registrar tu pedido. Por favor, intentá de nuevo en unos instantes.'
            );
            return;
        }

        const sucursal = getSucursal(sucursalId);
        sessionStorage.setItem('chisperio_last_order', JSON.stringify(pedido));
        // La sucursal elegida viaja a la pantalla de confirmación para que su
        // botón "Enviar por WhatsApp" abra el mismo número sin volver a preguntar.
        sessionStorage.setItem('chisperio_last_sucursal', sucursal.id);
        // Intento de apertura directa: en mobile (deep link nativo) funciona
        // siempre; en desktop el navegador puede bloquear el window.open por no
        // ser un gesto directo — para ese caso está el botón de reenvío en la
        // pantalla de confirmación.
        abrirWhatsApp(sucursal.numero, message);
        clearCart();
        quitarCodigoDescuento();
        setFormaPago(null);
        router.visit(route('confirmacion.index'));
    };

    const ic = (field) =>
        `${inputBase} ${errors[field] ? 'border-[#ba1a1a] bg-red-50/40' : 'border-black/[0.08]'}`;

    return (
        <div className="min-h-screen overflow-hidden bg-[#fcf9f8] text-[#1c1b1b] antialiased">
            <Head title="Finalizar pedido" />
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
                                        ¿A qué sucursal te lo enviamos?
                                    </h3>
                                    <p className="mt-1.5 text-sm font-medium text-[#81788a]">
                                        El envío es a sucursal, no a domicilio. Contanos provincia y ciudad para coordinar la más cercana.
                                    </p>
                                </div>

                                {/* Provincia / Ciudad */}
                                <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
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
                                    <FormField label="Ciudad" required error={errors.ciudad}>
                                        <input
                                            type="text"
                                            placeholder="Tu ciudad"
                                            value={form.ciudad}
                                            onChange={update('ciudad')}
                                            className={ic('ciudad')}
                                        />
                                    </FormField>
                                </div>

                                {/* Código Postal */}
                                <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
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

                                {/* Sucursal de atención por WhatsApp */}
                                <div className="mb-7 border-t border-black/[0.06] pt-7">
                                    <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#6000ca]">
                                        Sucursal de atención
                                    </p>
                                    <h3 className="text-xl font-black leading-tight tracking-tight text-[#1c1b1b]">
                                        ¿Con qué sucursal coordinás?
                                    </h3>
                                    <p className="mt-1.5 text-sm font-medium text-[#81788a]">
                                        Vas a finalizar el pedido por WhatsApp con el equipo de esta sucursal.
                                        {form.provincia
                                            ? ' Te marcamos la más cercana a tu provincia, pero podés cambiarla.'
                                            : ' Elegí una provincia arriba y te sugerimos la más cercana.'}
                                    </p>

                                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {WHATSAPP_SUCURSALES.map((sucursal) => {
                                            const seleccionada = sucursal.id === sucursalId;
                                            const esSugerida = Boolean(form.provincia) && sucursal.id === idSucursalSugerida;
                                            return (
                                                <button
                                                    key={sucursal.id}
                                                    type="button"
                                                    onClick={() => elegirSucursal(sucursal.id)}
                                                    aria-pressed={seleccionada}
                                                    className={`relative flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 ${
                                                        seleccionada
                                                            ? 'border-[#6000ca] bg-[#6000ca]/[0.04]'
                                                            : 'border-black/[0.08] bg-[#fcfbfd] hover:border-[#6000ca]/40'
                                                    }`}
                                                >
                                                    {esSugerida && (
                                                        <span className="absolute right-3 top-3 rounded-full bg-[#6000ca]/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#6000ca]">
                                                            Sugerida
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-[#1c1b1b]">
                                                        <span
                                                            className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                                                                seleccionada ? 'border-[#6000ca]' : 'border-[#b8afc0]'
                                                            }`}
                                                            aria-hidden="true"
                                                        >
                                                            {seleccionada && <span className="h-2 w-2 rounded-full bg-[#6000ca]" />}
                                                        </span>
                                                        {sucursal.nombre}
                                                    </span>
                                                    <span className="pl-6 text-xs font-medium text-[#81788a]">
                                                        {sucursal.telefonoLegible}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {form.provincia && sucursalId !== idSucursalSugerida && (
                                        <p className="mt-2.5 text-xs font-medium text-[#81788a]">
                                            Por tu provincia ({form.provincia}) te queda más cerca la sucursal{' '}
                                            <span className="font-bold text-[#4b4356]">{getSucursal(idSucursalSugerida).nombre}</span>.
                                        </p>
                                    )}
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
                                        <span className="font-extrabold text-[#6000ca]">WhatsApp</span> a la sucursal{' '}
                                        <span className="font-extrabold text-[#6000ca]">{getSucursal(sucursalId).nombre}</span>
                                        , para que nuestro personal te atienda y puedas finalizar tu compra.
                                    </p>
                                </div>

                                {/* Error de envío */}
                                {apiError && (
                                    <div role="alert" className="mb-4 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-[#ba1a1a]">
                                        {Array.isArray(apiError) ? (
                                            <ul className="list-disc space-y-1 pl-4">
                                                {apiError.map((mensaje, i) => (
                                                    <li key={i}>{mensaje}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            apiError
                                        )}
                                    </div>
                                )}

                                {/* Items sin stock: no dejamos ni intentar el envío (ver Carrito.jsx, mismo bloqueo) */}
                                {hayItemsSinStock && (
                                    <p role="alert" className="mb-4 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-[#ba1a1a]">
                                        Tenés productos sin stock en el carrito.{' '}
                                        <Link href={route('carrito.index')} className="underline underline-offset-2">
                                            Volvé al carrito
                                        </Link>{' '}
                                        para quitarlos y poder continuar.
                                    </p>
                                )}

                                {/* Botón submit */}
                                <button
                                    type="submit"
                                    disabled={items.length === 0 || isSubmitting || hayItemsSinStock}
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
                            <CheckoutSummary
                                items={items}
                                subtotal={subtotal}
                                codigoAplicado={codigoAplicado}
                                descuentoInfo={descuentoInfo}
                                montoDescuento={montoDescuento}
                                totalConDescuento={totalConDescuento}
                                validandoCodigo={validandoCodigo}
                                onAplicarCodigo={aplicarCodigoDescuento}
                                onQuitarCodigo={quitarCodigoDescuento}
                                codigoDescuentoError={codigoDescuentoError}
                                planesPagoTarjeta={planesPagoTarjeta}
                                formaPagoSeleccionada={formaPagoSeleccionada}
                                onSeleccionarFormaPago={setFormaPago}
                                recargoFormaPago={recargoFormaPago}
                                totalFinal={totalFinal}
                            />
                        </div>
                    </div>

                </div>
                </div>
            </main>

            <LandingFooter />
        </div>
    );
}
