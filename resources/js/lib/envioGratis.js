/**
 * Envío gratis por combo: un combo con `envio_gratis` solo lo da cuando es LO ÚNICO que
 * se compra. Si el carrito (o el pedido) tiene cualquier otro ítem, el envío gratis del
 * combo deja de valer y rige únicamente el monto mínimo que configura el admin.
 *
 * Con varios combos, vale si TODOS tienen envío gratis (no hay nada "de afuera").
 * Espeja la regla del servidor (PedidoController::store / PedidoEdicionService), que es la
 * que queda guardada en el pedido; esta función solo gobierna lo que se muestra en el
 * carrito y el checkout antes de comprar.
 *
 * `items`: líneas del carrito (CartContext), con `tipo` y `combo.envio_gratis`.
 */
export function envioGratisPorCombo(items) {
    return (
        Array.isArray(items) &&
        items.length > 0 &&
        items.every((item) => item.tipo === 'combo' && Boolean(item.combo?.envio_gratis))
    );
}

/**
 * ¿Hay en el carrito al menos un combo con envío gratis propio? Sirve para decidir si
 * corresponde explicar la condición (solo si se compra solo): si ningún combo lo tiene,
 * no hay nada que aclarar y rige directamente el monto del admin.
 */
export function hayComboConEnvioGratis(items) {
    return Array.isArray(items) && items.some((item) => item.tipo === 'combo' && Boolean(item.combo?.envio_gratis));
}
