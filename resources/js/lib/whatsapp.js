import { track } from './pixel';

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
 *   } | {
 *     // Línea de combo (ver itemsIncluidosCombo en lib/combo.js): en vez de
 *     // variante/addons, cada componente con su color (fijo o elegido), y si el
 *     // combo en sí tiene envío gratis (Combo.envio_gratis, independiente del monto
 *     // mínimo global de envío gratis).
 *     titulo, cantidad, subtotalItem,
 *     componentes: [{ titulo, cantidad, varianteNombre: string | null }],
 *     envioGratis: boolean,
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
 *
 * `evento`: evento del Meta Pixel a disparar al abrir (ver lib/pixel.js). Solo lo
 * pasa el modal de contacto ('Contact'); el envío del pedido desde Checkout y el
 * reenvío desde ConfirmacionPedido NO lo pasan, para no contar contactos falsos.
 */
export function abrirWhatsApp(numero, mensaje = WHATSAPP_MENSAJE_POR_DEFECTO, { evento } = {}) {
    // Antes de abrir: en mobile el deep link puede descargar la página.
    if (evento) track(evento);

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

    // Línea de combo: en vez de un único color, lista cada producto incluido con su
    // variante (fija o elegida) — ver itemsIncluidosCombo (lib/combo.js), que arma
    // este array en Checkout.jsx antes de llamar a buildOrderMessage.
    if (item.componentes) {
        lineas.push('   Incluye:');
        item.componentes.forEach((componente) => {
            const color = componente.varianteNombre ? ` (Color: ${componente.varianteNombre})` : '';
            lineas.push(`     - ${componente.cantidad}x ${componente.titulo}${color}`);
        });
        if (item.envioGratis) {
            lineas.push('   🚚 Este combo incluye envío gratis');
        }
        return lineas;
    }

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

/**
 * Normaliza un teléfono cargado a mano por el cliente (ej. "11 2345-6789",
 * "011 15 2345-6789", "+54 9 351 676-6208") al formato internacional sin `+` que
 * esperan wa.me/whatsapp:// para celulares argentinos (549 + área + número, sin
 * el 0 ni el 15). Si no se reconoce como un número argentino de 10 dígitos, se
 * devuelve el número tal cual (solo dígitos), asumiendo que ya trae su código de
 * país. `null` si no hay dígitos suficientes para armar un número.
 */
export function normalizarTelefonoWhatsApp(telefono) {
    let digitos = String(telefono ?? '').replace(/\D/g, '').replace(/^00/, '');

    if (digitos.length < 8) return null;

    if (digitos.startsWith('54')) {
        // 54 + 10 dígitos (fijo/sin 9) → falta el 9 de celular; 549 + 10 ya está bien.
        if (digitos.length === 12) digitos = `549${digitos.slice(2)}`;
        return digitos;
    }

    digitos = digitos.replace(/^0/, '');

    // "15" entre el código de área (2 a 4 dígitos) y el número: 12 dígitos → 10.
    if (digitos.length === 12) {
        for (const largoArea of [2, 3, 4]) {
            if (digitos.slice(largoArea, largoArea + 2) === '15') {
                digitos = digitos.slice(0, largoArea) + digitos.slice(largoArea + 2);
                break;
            }
        }
    }

    return digitos.length === 10 ? `549${digitos}` : digitos;
}

/**
 * Mensaje de WhatsApp con el resumen de un pedido ya guardado, para que admin/vendedor
 * se lo mande al cliente desde el detalle del pedido. `pedido` es el que llega del
 * servidor (snake_case, items con combo_items_seleccionados / addons_seleccionados).
 * Reusa lineasItem para que cada producto se vea igual que en el mensaje del checkout.
 */
export function buildPedidoClienteMessage(pedido) {
    const items = pedido.items.map((item) =>
        item.combo_id
            ? {
                  titulo: item.titulo,
                  cantidad: item.cantidad,
                  subtotalItem: Number(item.subtotal),
                  componentes: (item.combo_items_seleccionados || []).map((componente) => ({
                      titulo: componente.titulo,
                      cantidad: componente.cantidad_total,
                      varianteNombre: componente.variante_nombre,
                  })),
                  envioGratis: Boolean(item.combo?.envio_gratis),
              }
            : {
                  titulo: item.titulo,
                  cantidad: item.cantidad,
                  subtotalItem: Number(item.subtotal),
                  variante: item.variante_nombre ? { nombre: item.variante_nombre } : null,
                  colorPersonalizadoTexto: item.color_personalizado_texto,
                  addons: item.addons_seleccionados || [],
              }
    );

    const conTarjeta = Boolean(pedido.plan_pago_tarjeta_id);
    const totalFinal = Number(conTarjeta ? pedido.total_con_recargo : pedido.total);

    return [
        `¡Hola ${pedido.cliente_nombre}! 👋 Te escribimos de *Chisperío* por tu pedido #${pedido.id}.`,
        '',
        '📦 *Resumen de tu pedido:*',
        ...items.flatMap(lineasItem),
        pedido.envio_gratis ? '' : null,
        pedido.envio_gratis
            ? `🚚 Envío gratis por superar el monto de ${formatPrice(pedido.envio_gratis_monto_minimo)}`
            : null,
        '',
        `Subtotal: ${formatPrice(pedido.subtotal)}`,
        pedido.codigo_descuento_texto
            ? `Descuento (${pedido.codigo_descuento_texto}): -${formatPrice(pedido.descuento_monto)}`
            : null,
        conTarjeta
            ? `Recargo (${pedido.plan_pago_nombre}): +${formatPrice(pedido.recargo_monto)}`
            : null,
        `*Total: ${formatPrice(totalFinal)} ARS*`,
        conTarjeta
            ? `💳 Forma de pago: Tarjeta de crédito — ${
                  pedido.plan_pago_cuotas === 1
                      ? `1 cuota de ${formatPrice(totalFinal)}`
                      : `${pedido.plan_pago_cuotas} cuotas de ${formatPrice(totalFinal / pedido.plan_pago_cuotas)} c/u`
              }`
            : '💵 Forma de pago: Efectivo / Transferencia',
        pedido.observaciones ? '' : null,
        pedido.observaciones ? `📝 *Observaciones:* ${pedido.observaciones}` : null,
        '',
        '¿Está todo correcto? 😊',
    ]
        .filter((linea) => linea !== null)
        .join('\n');
}
