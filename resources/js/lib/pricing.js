/**
 * Espeja en cliente App\Services\PricingService (backend) para poder resolver el
 * precio de cualquier cantidad/escala sin ida y vuelta al servidor. La parte que
 * NO se porta acá es la vigencia de la oferta (is_active + rango de fechas): eso
 * ya viene resuelto por el backend en `producto.oferta_vigente` — si esa clave
 * viene con datos, la oferta está vigente ahora mismo.
 */

export function redondear2(valor) {
    return Math.round(valor * 100) / 100;
}

/**
 * Aplica un descuento porcentual o fijo a un precio de lista, clampeado a 0 y
 * redondeado a 2 decimales. Espeja PricingService::calcularPrecioConDescuento.
 */
export function aplicarDescuento(precioLista, tipoDescuento, valorDescuento) {
    const valor = parseFloat(valorDescuento);
    if (!tipoDescuento || !Number.isFinite(valor) || valor <= 0) {
        return precioLista;
    }

    const precio = tipoDescuento === 'porcentaje'
        ? precioLista * (1 - valor / 100)
        : precioLista - valor;

    return Math.max(0, redondear2(precio));
}

/**
 * Resuelve la escala aplicable a una cantidad: la de mayor cantidad_minima que
 * sea <= cantidad. Null si ninguna aplica (el precio base es el fallback).
 * Espeja Producto::escalaAplicable.
 */
export function resolverEscalaAplicable(escalasPrecio, cantidad) {
    const aplicables = (escalasPrecio || []).filter((escala) => escala.cantidad_minima <= cantidad);
    if (aplicables.length === 0) return null;

    return aplicables.reduce((mayor, escala) =>
        escala.cantidad_minima > mayor.cantidad_minima ? escala : mayor
    );
}

/**
 * Determina si la oferta vigente aplica al nivel de precio resuelto (precio base
 * o una escala específica). Espeja PricingService::ofertaAplicaAEscala.
 */
function ofertaAplicaAEscala(oferta, escalaAplicada) {
    if (oferta.alcance === 'especifico') {
        const escalaId = oferta.producto_escala_precio_id ?? null;
        return escalaId === (escalaAplicada ? escalaAplicada.id : null);
    }

    return true;
}

/**
 * Calcula el precio unitario de `producto` para `cantidad` unidades, resolviendo
 * escala + oferta vigente igual que PricingService::calcularPrecio. Además de los
 * campos que espejan al backend (precioLista/precioFinal/ofertaAplicada/ahorroPorcentaje,
 * este último = ahorro de la oferta sobre el precio de lista de ESE nivel), devuelve
 * ahorroTotalPorcentaje: el ahorro combinado (escala + oferta) contra el precio base
 * del producto, útil para el precio destacado de la ficha.
 */
export function resolverPrecio(producto, cantidad) {
    const escalas = producto.escalas_precio || [];
    const escalaAplicada = resolverEscalaAplicable(escalas, cantidad);
    const precioBase = redondear2(Number(producto.precio));
    const precioLista = redondear2(
        escalaAplicada ? Number(escalaAplicada.precio_unitario) : precioBase
    );

    const oferta = producto.oferta_vigente || null;
    const ofertaTieneDescuentoValido = !!oferta && oferta.tipo_descuento != null && oferta.valor_descuento != null;
    const ofertaAplicada = ofertaTieneDescuentoValido && ofertaAplicaAEscala(oferta, escalaAplicada);

    const precioFinal = ofertaAplicada
        ? aplicarDescuento(precioLista, oferta.tipo_descuento, oferta.valor_descuento)
        : precioLista;

    const ahorroUnitario = redondear2(Math.max(0, precioLista - precioFinal));
    const ahorroPorcentaje = precioLista > 0 ? redondear2((ahorroUnitario / precioLista) * 100) : 0;

    const ahorroTotalUnitario = redondear2(Math.max(0, precioBase - precioFinal));
    const ahorroTotalPorcentaje = precioBase > 0 ? redondear2((ahorroTotalUnitario / precioBase) * 100) : 0;

    return {
        escalaAplicada,
        precioBase,
        precioLista,
        precioFinal,
        ofertaAplicada,
        ahorroPorcentaje,
        ahorroTotalPorcentaje,
    };
}
