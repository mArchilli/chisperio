/**
 * Arma el texto del mensaje de WhatsApp para un pedido. Única fuente de verdad del
 * formato: antes se armaba a mano en Checkout.jsx y se replicaba tal cual (como
 * texto ya renderizado) desde ConfirmacionPedido.jsx — si mañana cambia el formato,
 * alcanza con tocar este archivo.
 *
 * Shape esperado de `pedido`:
 * {
 *   cliente: { nombre, apellido, dni, provincia, ciudad, codigoPostal, telefono, email },
 *   observaciones: string | null,
 *   items: [{
 *     titulo, cantidad, subtotalItem,
 *     variante: { nombre } | null,
 *     colorPersonalizadoTexto: string | null,
 *     addons: [{ nombre, texto_personalizado }],
 *   }],
 *   subtotal: number,
 *   codigoDescuento: string | null,
 *   montoDescuento: number,
 *   formaPago: {
 *     nombre: string, cuotas: number, recargoPorcentaje: number,
 *     recargoMonto: number, montoPorCuota: number, totalConRecargo: number,
 *   } | null,
 *   total: number,
 *   envioGratis: { alcanzado: boolean, montoMinimo: number } | null,
 * }
 */

/**
 * Sucursales de atención por WhatsApp. La mayoría de los botones del sitio no
 * abren un número directo: disparan el modal de selección de sucursal (ver
 * WhatsAppSucursalContext / WhatsAppSucursalModal). El checkout es la excepción
 * — ahí la sucursal se elige en el propio formulario (preseleccionada según la
 * provincia, ver `sucursalSugeridaId`). Única fuente de verdad del número —
 * antes estaba hardcodeado en 7 archivos.
 *
 * `numero`: formato internacional sin `+`, como esperan wa.me y whatsapp://.
 */
export const WHATSAPP_SUCURSALES = [
    {
        id: 'buenos-aires',
        nombre: 'Buenos Aires',
        numero: '5491127930349',
        telefonoLegible: '+54 9 11 2793-0349',
        instagram: 'https://www.instagram.com/chisperio.argentina/',
        instagramHandle: '@chisperio.argentina',
    },
    {
        id: 'cordoba',
        nombre: 'Córdoba',
        numero: '5493516766208',
        telefonoLegible: '+54 9 3516 76-6208',
        instagram: 'https://www.instagram.com/chisperio.cordoba/',
        instagramHandle: '@chisperio.cordoba',
    },
];

export const SUCURSAL_POR_DEFECTO_ID = 'buenos-aires';

/** Mapa id de sucursal → nombre legible. Espeja `App\Enums\Sucursal::label()`. */
export const SUCURSAL_LABELS = Object.fromEntries(
    WHATSAPP_SUCURSALES.map((sucursal) => [sucursal.id, sucursal.nombre])
);

/**
 * Provincias (tal cual las lista Checkout.jsx) que atiende cada sucursal, para
 * SUGERIR una en el checkout según la provincia elegida — la persona siempre
 * puede cambiarla. Criterio: centro + norte + Cuyo → Córdoba; el este, el
 * litoral (Santa Fe / Entre Ríos incluidos) y toda la Patagonia → Buenos Aires.
 * Cualquier provincia que no esté acá cae en la sucursal por defecto.
 */
const PROVINCIAS_POR_SUCURSAL = {
    cordoba: [
        'Córdoba',
        'Santiago del Estero',
        'Tucumán',
        'Salta',
        'Jujuy',
        'Catamarca',
        'La Rioja',
        'San Juan',
        'San Luis',
        'Mendoza',
    ],
};

/**
 * Id de la sucursal sugerida para `provincia`. Sin provincia o sin match →
 * SUCURSAL_POR_DEFECTO_ID ('buenos-aires').
 */
export function sucursalSugeridaId(provincia) {
    if (!provincia) return SUCURSAL_POR_DEFECTO_ID;
    const match = Object.entries(PROVINCIAS_POR_SUCURSAL).find(([, provincias]) =>
        provincias.includes(provincia)
    );
    return match ? match[0] : SUCURSAL_POR_DEFECTO_ID;
}

/** Sucursal por id; cae en la primera de la lista si el id no existe. */
export function getSucursal(id) {
    return WHATSAPP_SUCURSALES.find((sucursal) => sucursal.id === id) ?? WHATSAPP_SUCURSALES[0];
}

export const WHATSAPP_MENSAJE_POR_DEFECTO = '¡Hola! Necesito asesoramiento 😊';

/**
 * Abre WhatsApp hacia `numero` (formato internacional sin `+`) con `mensaje`
 * prellenado. En mobile usa el deep link nativo; en desktop, wa.me en una
 * pestaña nueva. Mismo criterio que usaban Checkout.jsx / ConfirmacionPedido.jsx
 * antes de centralizarse acá.
 */
export function abrirWhatsApp(numero, mensaje = WHATSAPP_MENSAJE_POR_DEFECTO) {
    const esMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );
    const encoded = encodeURIComponent(mensaje);
    if (esMobile) {
        window.location.href = `whatsapp://send?phone=${numero}&text=${encoded}`;
    } else {
        window.open(`https://wa.me/${numero}?text=${encoded}`, '_blank', 'noopener,noreferrer');
    }
}

const formatPrice = (price) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);

// Mismo criterio de formateo que FormaPagoBlock.jsx: sin ceros de más (ej. "20%" en
// vez de "20.00%"), porque acá va dentro de una oración, no en una etiqueta suelta.
const formatPercent = (valor) => `${parseFloat(Number(valor).toFixed(2))}%`;

/**
 * Líneas de detalle de un item: cantidad + título + subtotal (ya con recargo de
 * variante y add-ons incluidos), más "Color: {nombre}", "Color solicitado: {texto}"
 * (solo cuando la variante es "Otro / a elección del cliente") y una línea por cada
 * personalización, solo cuando el item efectivamente los tiene — un item sin nada de
 * eso no agrega ninguna línea extra.
 */
function lineasItem(item) {
    const lineas = [`• ${item.titulo} x${item.cantidad} — ${formatPrice(item.subtotalItem)}`];

    if (item.variante) {
        lineas.push(`   Color: ${item.variante.nombre}`);
    }

    if (item.colorPersonalizadoTexto) {
        lineas.push(`   Color solicitado: ${item.colorPersonalizadoTexto}`);
    }

    (item.addons || []).forEach((addon) => {
        lineas.push(
            `   ${addon.nombre}${addon.texto_personalizado ? `: "${addon.texto_personalizado}"` : ''}`
        );
    });

    return lineas;
}

export function buildOrderMessage(pedido) {
    const { cliente, envioGratis } = pedido;

    return [
        '*Nuevo Pedido Web - Chisperío*',
        '',
        `Nombre: ${cliente.nombre} ${cliente.apellido}`,
        '',
        '📦 *Productos:*',
        ...pedido.items.flatMap(lineasItem),
        envioGratis?.alcanzado ? '' : null,
        envioGratis?.alcanzado
            ? `🚚 Envío gratis por superar el monto de ${formatPrice(envioGratis.montoMinimo)}`
            : null,
        '',
        `Subtotal: ${formatPrice(pedido.subtotal)}`,
        pedido.codigoDescuento ? `Descuento (${pedido.codigoDescuento}): -${formatPrice(pedido.montoDescuento)}` : null,
        pedido.formaPago ? `Recargo (${pedido.formaPago.nombre}): +${formatPrice(pedido.formaPago.recargoMonto)}` : null,
        `*Total: ${formatPrice(pedido.total)} ARS*`,
        pedido.formaPago
            ? `💳 Forma de pago: ${pedido.formaPago.nombre} — ${
                  pedido.formaPago.cuotas === 1
                      ? `1 cuota de ${formatPrice(pedido.formaPago.montoPorCuota)}`
                      : `${pedido.formaPago.cuotas} cuotas de ${formatPrice(pedido.formaPago.montoPorCuota)} c/u`
              }`
            : null,
        '',
        '📋 *Datos del cliente:*',
        `Nombre: ${cliente.nombre} ${cliente.apellido}`,
        `DNI: ${cliente.dni}`,
        `Provincia: ${cliente.provincia}`,
        `Ciudad: ${cliente.ciudad}`,
        `Código Postal: ${cliente.codigoPostal}`,
        `Teléfono: ${cliente.telefono}`,
        `Email: ${cliente.email}`,
        pedido.observaciones ? '' : null,
        pedido.observaciones ? `📝 *Observaciones:* ${pedido.observaciones}` : null,
        pedido.formaPago ? '' : null,
        // Bloque dirigido al vendedor, no solo informativo: tiene que poder generar el
        // link de pago sin calcular nada ni volver a preguntarle al cliente. El monto
        // del link es siempre totalConRecargo (el total real a cobrar con tarjeta), la
        // misma cifra que ya vio el cliente en el checkout — nunca se recalcula acá.
        pedido.formaPago
            ? [
                  `💳 Forma de pago: Tarjeta de crédito — ${pedido.formaPago.cuotas} cuota${
                        pedido.formaPago.cuotas === 1 ? '' : 's'
                    } sin interés mensual, recargo ${formatPercent(pedido.formaPago.recargoPorcentaje)}`,
                  `Total a cobrar: ${formatPrice(pedido.formaPago.totalConRecargo)} (${formatPrice(pedido.formaPago.montoPorCuota)} c/u)`,
                  `👉 Generar link de pago en Mercado Pago por ${formatPrice(pedido.formaPago.totalConRecargo)}`,
              ].join('\n')
            : null,
    ]
        .filter((linea) => linea !== null)
        .join('\n');
}
