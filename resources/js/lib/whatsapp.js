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
 *   total: number,
 *   envioGratis: { alcanzado: boolean, montoMinimo: number } | null,
 * }
 */

const formatPrice = (price) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);

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
        `*Total: ${formatPrice(pedido.total)} ARS*`,
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
    ]
        .filter((linea) => linea !== null)
        .join('\n');
}
