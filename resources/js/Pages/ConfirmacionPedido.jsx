import { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import LandingHeader from '@/Components/Landing/LandingHeader';
import LandingFooter from '@/Components/Landing/LandingFooter';
import { useWhatsAppSucursal } from '@/Context/WhatsAppSucursalContext';
import { buildOrderMessage, abrirWhatsApp, getSucursal } from '@/lib/whatsapp';
import { track, productContentId, comboContentId, CURRENCY } from '@/lib/pixel';

const STEPS = [
    {
        n: '01',
        title: 'Revisá tu WhatsApp',
        body: 'Te vamos a escribir a la brevedad para confirmar los detalles de tu pedido.',
    },
    {
        n: '02',
        title: 'Coordinamos pago y envío',
        body: 'Acordamos el medio de pago y la modalidad de entrega según tu zona.',
    },
    {
        n: '03',
        title: 'Tu pedido en camino',
        body: 'Una vez confirmado el pago, preparamos y despachamos tu compra.',
    },
];

export default function ConfirmacionPedido({ canLogin }) {
    const { abrirSelectorWhatsApp } = useWhatsAppSucursal();
    const [message, setMessage] = useState(null);
    // Sucursal elegida en el checkout (Checkout.jsx la guarda junto al pedido).
    // Si no está —pedido viejo, sessionStorage limpiado— el botón cae al modal
    // de selección de sucursal en vez de abrir un número fijo.
    const [sucursal, setSucursal] = useState(null);

    useEffect(() => {
        const stored = sessionStorage.getItem('chisperio_last_order');
        if (!stored) return;

        try {
            setMessage(buildOrderMessage(JSON.parse(stored)));
            const sucursalId = sessionStorage.getItem('chisperio_last_sucursal');
            if (sucursalId) setSucursal(getSucursal(sucursalId));
        } catch {
            // Formato viejo (texto plano guardado por una versión anterior de Checkout.jsx)
            // o JSON corrupto: no hay pedido estructurado para reconstruir el mensaje, se
            // omite el botón de reenvío en vez de mostrar algo roto.
        }
    }, []);

    // Meta Pixel: Purchase una sola vez por pedido. Solo corre al montar la página (el
    // botón de reenvío no lo dispara). La marca en localStorage se chequea ANTES de
    // disparar y se escribe inmediatamente DESPUÉS, así una recarga no lo repite.
    // `value` = `total` del pedido en el servidor (subtotal menos descuento), SIN el recargo
    // por cuotas con tarjeta, a propósito: coincide con el InitiateCheckout de Checkout.jsx.
    useEffect(() => {
        try {
            const ref = JSON.parse(sessionStorage.getItem('chisperio_last_order_ref'));
            const pedido = JSON.parse(sessionStorage.getItem('chisperio_last_order'));
            const total = Number(ref?.total);
            if (!ref?.id || ref.total == null || ref.total === '' || !Number.isFinite(total) || !pedido) return;

            const marca = `chisperio_pixel_purchase_${ref.id}`;
            if (localStorage.getItem(marca)) return;

            const items = pedido.items ?? [];
            const contentIds = items
                .map((item) => (item.combo_id ? comboContentId(item.combo_id) : item.producto_id ? productContentId(item.producto_id) : null))
                .filter(Boolean);

            track(
                'Purchase',
                {
                    content_ids: [...new Set(contentIds)],
                    content_type: 'product',
                    value: total,
                    currency: CURRENCY,
                    num_items: items.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0),
                },
                { eventID: `order_${ref.id}` }
            );
            localStorage.setItem(marca, '1');
        } catch {
            // Sin storage utilizable (o JSON corrupto) no se puede garantizar el "una sola
            // vez": se omite el evento antes que arriesgar duplicados.
        }
    }, []);

    const reenviarPorWhatsApp = () => {
        if (sucursal) {
            abrirWhatsApp(sucursal.numero, message);
        } else {
            abrirSelectorWhatsApp(message);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#fcf9f8] text-[#1c1b1b] antialiased">
            <Head title="Pedido confirmado" />

            <LandingHeader canLogin={canLogin} />

            <main className="flex-1 flex items-center justify-center px-6 py-16 md:py-24">
                <div className="w-full max-w-[1440px] flex justify-center">
                <div className="w-full max-w-[460px]">

                    {/* Acento de marca */}
                    <div className="w-10 h-[3px] rounded-full bg-gradient-to-r from-[#6000ca] to-[#FF00D4] mb-10" />

                    {/* Encabezado */}
                    <h1 className="text-[40px] md:text-[52px] font-black text-[#1c1b1b] leading-[1.05] tracking-tight mb-4">
                        ¡Pedido<br />enviado.
                    </h1>

                    <p className="text-[#7c7388] text-base leading-relaxed mb-10">
                        Gracias por tu compra. Nuestro equipo va a contactarte a la brevedad
                        para coordinar el pago y la entrega.
                    </p>

                    {/* Divisor */}
                    <div className="h-px bg-[#e5e2e1] mb-10" />

                    {/* Pasos */}
                    <div className="space-y-6 mb-10">
                        {STEPS.map(({ n, title, body }) => (
                            <div key={n} className="flex gap-5">
                                <span className="text-xs font-black text-[#6000ca] tracking-widest pt-0.5 w-5 flex-shrink-0 select-none">
                                    {n}
                                </span>
                                <div>
                                    <p className="font-bold text-[#1c1b1b] text-sm leading-snug mb-1">
                                        {title}
                                    </p>
                                    <p className="text-[#7c7388] text-sm leading-relaxed">{body}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Divisor */}
                    <div className="h-px bg-[#e5e2e1] mb-10" />

                    {/* Acciones */}
                    <div className="space-y-3">
                        {message && (
                            <>
                                <p className="text-xs text-[#7c7388] mb-3">
                                    ¿No llegaste a enviar el pedido por WhatsApp?
                                    {sucursal && ` Se envía a la sucursal ${sucursal.nombre}.`}
                                </p>
                                <button
                                    type="button"
                                    onClick={reenviarPorWhatsApp}
                                    className="w-full flex items-center justify-center gap-2.5 bg-[#25D366] text-white font-bold py-3.5 rounded-xl hover:bg-[#1ebe5a] active:scale-[0.98] transition-all shadow-md shadow-green-500/15 text-sm"
                                >
                                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                    </svg>
                                    {sucursal ? `Enviar a WhatsApp ${sucursal.nombre}` : 'Enviar por WhatsApp'}
                                </button>
                            </>
                        )}

                        <Link
                            href={route('tienda.index')}
                            className="flex items-center justify-center gap-1.5 text-sm font-semibold text-[#7c7388] hover:text-[#6000ca] transition-colors py-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                            Seguir explorando el catálogo
                        </Link>
                    </div>

                </div>
                </div>
            </main>

            <LandingFooter />
        </div>
    );
}
