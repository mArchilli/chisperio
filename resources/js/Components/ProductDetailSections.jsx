import { ChevronDown, CreditCard, Palette, Store, Tag, Truck } from 'lucide-react';
import { calcular as calcularRecargoPago } from '@/lib/recargoPago';

const formatPrice = (price) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
    }).format(price);

const formatPercent = (value) =>
    new Intl.NumberFormat('es-AR', {
        maximumFractionDigits: 2,
    }).format(Number(value));

export function ProductPaymentOptions({ planes, planSeleccionado, recargoInfo, total, qty, incompleto, onSelect }) {
    if (!planes.length) return null;

    // Priorizamos los planes sin recargo y, dentro de ellos, la mayor cantidad de cuotas.
    const destacado = [...planes].sort(
        (a, b) =>
            Number(Number(a.recargo_porcentaje) > 0) - Number(Number(b.recargo_porcentaje) > 0) || b.cuotas - a.cuotas,
    )[0];
    const planVisible = planSeleccionado ?? destacado;
    const calculo = recargoInfo ?? calcularRecargoPago(total, planVisible);
    const tieneRecargo = Number(planVisible.recargo_porcentaje) > 0;

    return (
        <div className="mt-3 text-sm">
            {incompleto ? (
                <p className="text-xs leading-relaxed text-[#737373]">
                    Completá el reparto de colores para calcular las cuotas.
                </p>
            ) : (
                <>
                    <p className="leading-relaxed text-[#1c1b1b]">
                        {planSeleccionado ? '' : 'Hasta '}
                        <span className="font-semibold">
                            {planVisible.cuotas} {Number(planVisible.cuotas) === 1 ? 'cuota' : 'cuotas'} de{' '}
                            {formatPrice(calculo.monto_por_cuota)}
                        </span>
                        {!tieneRecargo && <span className="text-[#008744]"> sin recargo</span>}
                    </p>
                    {tieneRecargo && (
                        <p className="mt-1 text-xs text-[#737373]">
                            Incluye {formatPercent(planVisible.recargo_porcentaje)}% de recargo. Total:{' '}
                            {formatPrice(calculo.total_con_recargo)}.
                        </p>
                    )}
                    {qty > 1 && <p className="mt-1 text-xs text-[#737373]">Para las {qty} unidades seleccionadas.</p>}
                </>
            )}
            <details className="group mt-2">
                <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-[#6000ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] [&::-webkit-details-marker]:hidden">
                    Ver medios de pago y cuotas
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="mt-2 rounded-lg border border-black/10 bg-[#fafafa] p-4">
                    <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                        <CreditCard className="h-4 w-4" aria-hidden="true" /> Elegí cómo pagar
                    </p>
                    <p className="mb-3 text-xs leading-relaxed text-[#737373]">
                        {incompleto
                            ? 'Completá el reparto de colores para ver el total de tu selección.'
                            : `Cuotas calculadas sobre ${qty} ${qty === 1 ? 'unidad' : 'unidades'}: ${formatPrice(total)}.`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {planes.map((plan) => (
                            <button
                                key={plan.id}
                                type="button"
                                onClick={() => onSelect(plan.id)}
                                aria-pressed={planSeleccionado?.id === plan.id}
                                className={`min-h-11 rounded-md border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 ${planSeleccionado?.id === plan.id ? 'border-[#6000ca] bg-[#6000ca] text-white' : 'border-black/10 bg-white text-[#6000ca] hover:border-[#6000ca]'}`}
                            >
                                {plan.cuotas} {Number(plan.cuotas) === 1 ? 'cuota' : 'cuotas'}
                                {Number(plan.recargo_porcentaje) > 0
                                    ? ` (+${formatPercent(plan.recargo_porcentaje)}%)`
                                    : ' sin recargo'}
                            </button>
                        ))}
                    </div>
                    {planSeleccionado && !incompleto && (
                        <p className="mt-3 text-sm font-semibold">
                            Total con este medio de pago: {formatPrice(calculo.total_con_recargo)}
                        </p>
                    )}
                    <p className="mt-3 text-xs leading-relaxed text-[#737373]">
                        También podés pagar en efectivo o por transferencia. El plan elegido se aplica al total de tu
                        pedido al finalizar la compra.
                    </p>
                </div>
            </details>
        </div>
    );
}

export function ProductDeliveryInfo({ montoMinimo, total }) {
    const minimo = Number(montoMinimo ?? 0);
    const envioGratis = minimo > 0 && total >= minimo;

    return (
        <div className="flex items-start gap-3 py-4">
            <Truck
                className={`mt-0.5 h-5 w-5 shrink-0 ${envioGratis ? 'text-[#008744]' : 'text-[#737373]'}`}
                aria-hidden="true"
            />
            <div>
                <p className={`text-sm font-semibold ${minimo > 0 ? 'text-[#008744]' : 'text-[#1c1b1b]'}`}>
                    {envioGratis
                        ? 'Envío gratis en esta selección'
                        : minimo > 0
                          ? `Envío gratis en compras desde ${formatPrice(minimo)}`
                          : 'Envío a coordinar'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#737373]">
                    Coordiná {envioGratis ? 'la entrega' : 'el costo y la entrega'} por WhatsApp al finalizar tu pedido.
                </p>
            </div>
        </div>
    );
}

export function ProductSellerInfo({ tieneResenas }) {
    return (
        <div className="mt-6 border-t border-black/10 pt-5">
            <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6000ca]/[0.06] text-[#6000ca]">
                    <Store className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="text-sm">
                    <p>
                        Vendido por <span className="font-semibold text-[#6000ca]">Chisperío</span>
                    </p>
                    <p className="mt-1 text-xs text-[#737373]">Atención y coordinación por WhatsApp</p>
                </div>
            </div>
            {tieneResenas && (
                <a
                    href="#opiniones-clientes"
                    className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-[#6000ca] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca]"
                >
                    Ver opiniones sobre Chisperío
                </a>
            )}
        </div>
    );
}

export function ProductAttributes({ producto }) {
    const filas = [
        { label: 'Categoría', value: producto.categorias?.map((cat) => cat.nombre).join(', '), Icon: Tag },
        { label: 'Tipo de producto', value: producto.subcategorias?.map((sub) => sub.nombre).join(', '), Icon: Tag },
        {
            label: 'Colores disponibles',
            value: producto.variantes?.map((variante) => variante.nombre).join(', '),
            Icon: Palette,
        },
        {
            label: 'Personalizaciones disponibles',
            value: producto.addons?.map((addon) => addon.nombre).join(', '),
            Icon: Tag,
        },
    ].filter((fila) => fila.value);

    if (!filas.length) return null;

    return (
        <section
            className="border-t border-black/10 px-4 py-8 sm:px-6 lg:px-8"
            aria-labelledby="caracteristicas-producto"
        >
            <h2 id="caracteristicas-producto" className="mb-6 text-lg font-medium">
                Características del producto
            </h2>
            <dl className="grid gap-5 sm:grid-cols-2">
                {filas.map(({ label, value, Icon }) => (
                    <div key={label} className="flex min-w-0 items-start gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5]">
                            <Icon className="h-4 w-4 text-[#737373]" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 text-sm leading-relaxed">
                            <dt className="text-[#737373]">{label}</dt>
                            <dd className="break-words font-medium">{value}</dd>
                        </div>
                    </div>
                ))}
            </dl>
        </section>
    );
}
