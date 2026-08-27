const formatPercent = (valor) => `${parseFloat(Number(valor).toFixed(2))}%`;

/**
 * Selector de forma de pago: efectivo/transferencia (sin recargo, opción por
 * defecto cuando `seleccionado` es null) o uno de los planes de tarjeta activos.
 * Compartido entre Carrito.jsx y Checkout.jsx, mismo criterio de bloque
 * autocontenido que CodigoDescuentoBlock — acá no hay "aplicar/quitar" porque
 * siempre hay una opción elegida, así que cambiar de opción es un solo click.
 *
 * `seleccionado` es el snapshot que guarda CartContext (planId/cuotas/
 * recargoPorcentaje); `planes` son los planes activos tal cual los comparte
 * HandleInertiaRequests (id/nombre/cuotas/recargo_porcentaje). onSeleccionar
 * recibe el plan activo completo (o null para efectivo) — CartContext.setFormaPago
 * ya sabe convertirlo al shape que persiste.
 */
export default function FormaPagoBlock({ planes, seleccionado, onSeleccionar }) {
    const planesActivos = planes ?? [];
    if (planesActivos.length === 0) return null;

    const planIdSeleccionado = seleccionado?.planId ?? null;

    const optionClass = (activo) =>
        `flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 ${
            activo
                ? 'border-[#6000ca] bg-[#6000ca]/[0.06] text-[#6000ca]'
                : 'border-black/[0.08] bg-white text-[#1c1b1b] hover:border-[#6000ca]/30'
        }`;

    return (
        <div className="mb-5">
            <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#81788a]">
                Forma de pago
            </p>
            <div className="space-y-2">
                <button
                    type="button"
                    onClick={() => onSeleccionar(null)}
                    aria-pressed={planIdSeleccionado === null}
                    className={optionClass(planIdSeleccionado === null)}
                >
                    <span>Efectivo / Transferencia</span>
                    <span className="flex-shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-[#1c8a4c]">
                        Sin recargo
                    </span>
                </button>

                {planesActivos.map((plan) => {
                    const activo = planIdSeleccionado === plan.id;
                    return (
                        <button
                            key={plan.id}
                            type="button"
                            onClick={() => onSeleccionar(plan)}
                            aria-pressed={activo}
                            className={optionClass(activo)}
                        >
                            <span>{plan.nombre}</span>
                            {Number(plan.recargo_porcentaje) > 0 && (
                                <span className="flex-shrink-0 text-[10px] font-extrabold uppercase tracking-wide text-[#81788a]">
                                    +{formatPercent(plan.recargo_porcentaje)}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
