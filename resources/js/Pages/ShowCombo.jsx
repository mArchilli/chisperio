import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import LandingHeader from '@/Components/Landing/LandingHeader';
import BackToCatalog from '@/Components/BackToCatalog';
import LandingFooter from '@/Components/Landing/LandingFooter';
import ProductGallery from '@/Components/ProductGallery';
import StickyGallery from '@/Components/StickyGallery';
import ResenasConfianza from '@/Components/ResenasConfianza';
import VarianteColorSwatches from '@/Components/VarianteColorSwatches';
import {
    ProductDeliveryInfo,
    ProductPaymentOptions,
    ProductSellerInfo,
} from '@/Components/ProductDetailSections';
import { ShoppingCart, Truck } from 'lucide-react';
import { useCart } from '@/Context/CartContext';
import { redondear2, resolverPrecio } from '@/lib/pricing';
import { calcular as calcularRecargoPago } from '@/lib/recargoPago';
import { stockDisponibleCombo } from '@/lib/combo';
import { UMBRAL_STOCK_BAJO } from '@/lib/stock';
import { track, itemEventParams } from '@/lib/pixel';

const formatPrice = (price) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);

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

/**
 * Items del combo que exigen que el comprador elija una variante (sin variante fija
 * y el producto tiene colores activos) — ComboProducto::requiereSeleccionVariante().
 */
function itemsConSeleccionRequerida(combo) {
    return (combo.items ?? []).filter(
        (item) => item.producto_variante_id === null && (item.producto?.variantes_activas?.length ?? 0) > 0,
    );
}

export default function ShowCombo({ combo, resenas = [], canLogin }) {
    const { addComboToCart, setFormaPago } = useCart();
    const { planesPagoTarjeta, configuracionEnvio } = usePage().props;
    const montoMinimoEnvio = configuracionEnvio?.montoMinimo ?? 0;
    const itemsRequeridos = useMemo(() => itemsConSeleccionRequerida(combo), [combo]);

    const [selecciones, setSelecciones] = useState(() => {
        const inicial = {};
        itemsRequeridos.forEach((item) => {
            inicial[item.id] = item.producto.variantes_activas[0]?.id ?? null;
        });
        return inicial;
    });
    const [qty, setQty] = useState(1);
    const [toast, setToast] = useState(null);
    const [planPagoId, setPlanPagoId] = useState(null);

    // Meta Pixel: una vez por combo visto (depende del id: Inertia reusa el componente).
    useEffect(() => {
        track(
            'ViewContent',
            itemEventParams({
                tipo: 'combo',
                id: combo.id,
                titulo: combo.titulo,
                value: resolverPrecio(combo, 1).precioFinalConOpciones,
            }),
        );
    }, [combo.id]);

    const topeCantidad = stockDisponibleCombo(combo, selecciones);
    const agotado = topeCantidad === 0;
    const stockBajo = topeCantidad !== null && topeCantidad > 0 && topeCantidad <= UMBRAL_STOCK_BAJO;

    useEffect(() => {
        if (topeCantidad !== null && qty > topeCantidad) {
            setQty(Math.max(1, topeCantidad));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [topeCantidad]);

    const precioInfo = useMemo(() => resolverPrecio(combo, qty), [combo, qty]);
    const tieneDescuento = precioInfo.precioFinal < precioInfo.precioBase;
    const ahorroPorcentaje = Math.round(precioInfo.ahorroTotalPorcentaje);
    const totalCombo = redondear2(precioInfo.precioFinalConOpciones * qty);

    // Simulador de recargo por tarjeta, igual que en la ficha de producto: corre sobre el
    // total de ESTE combo y deja la forma de pago sugerida para todo el pedido (CartContext).
    const planesPagoActivos = planesPagoTarjeta ?? [];
    const planPagoSeleccionado = planesPagoActivos.find((p) => p.id === planPagoId) ?? null;
    const recargoInfo = useMemo(
        () => (planPagoSeleccionado ? calcularRecargoPago(totalCombo, planPagoSeleccionado) : null),
        [planPagoSeleccionado, totalCombo],
    );
    const togglePlanPago = (id) => {
        const siguienteId = planPagoId === id ? null : id;
        setPlanPagoId(siguienteId);
        setFormaPago(planesPagoActivos.find((plan) => plan.id === siguienteId) ?? null);
    };

    const faltaElegirAlgunaVariante = itemsRequeridos.some((item) => !selecciones[item.id]);
    const puedeAgregar = !agotado && !faltaElegirAlgunaVariante;

    const setSeleccionItem = (itemId, varianteId) => {
        setSelecciones((prev) => ({ ...prev, [itemId]: varianteId }));
    };

    const cambiarQty = (valor) => {
        const clamped = Math.max(1, valor);
        setQty(topeCantidad === null ? clamped : Math.min(clamped, Math.max(1, topeCantidad)));
    };

    const handleAddToCart = (comprarAhora = false) => {
        if (!puedeAgregar) return;

        const seleccionesArray = itemsRequeridos.map((item) => {
            const varianteId = selecciones[item.id];
            const variante = item.producto.variantes_activas.find((v) => v.id === varianteId);
            return {
                comboItemId: item.id,
                productoId: item.producto_id,
                varianteId,
                varianteNombre: variante?.nombre ?? null,
                varianteColorHex: variante?.color_hex ?? null,
            };
        });

        addComboToCart(combo, qty, seleccionesArray);

        if (comprarAhora) {
            router.visit(route('checkout.index'));
            return;
        }

        if (toast) clearTimeout(window._toastComboTimer);
        setToast(`${combo.titulo} agregado al carrito`);
        window._toastComboTimer = setTimeout(() => setToast(null), 2500);
    };

    return (
        <div className="min-h-screen overflow-x-clip bg-white text-[#1c1b1b] antialiased lg:bg-[#f5f5f5]">
            <Head title={combo.titulo} />
            <LandingHeader canLogin={canLogin} />
            <main className="mx-auto w-full max-w-[1200px] pb-24 lg:px-6 lg:pb-16">
                <BackToCatalog cardKey={`c-${combo.id}`} />
                <nav
                    aria-label="Migas de pan"
                    className="hidden items-center gap-2 px-4 py-4 text-xs text-[#737373] lg:flex"
                >
                    <Link href="/" className="hover:text-[#6000ca]">
                        Inicio
                    </Link>
                    <ArrowIcon className="h-3 w-3" />
                    <Link href={route('tienda.index', { filter: 'combos' })} className="hover:text-[#6000ca]">
                        Combos
                    </Link>
                </nav>
                <div className="mt-4 bg-white lg:mt-0 lg:rounded-xl lg:border lg:border-black/10">
                    <section
                        className="grid min-w-0 items-start lg:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.85fr)] lg:gap-x-8 lg:p-8"
                        aria-label="Detalle y compra del combo"
                    >
                        <div className="order-1 min-w-0 px-4 pt-1 sm:px-6 lg:col-start-2 lg:row-start-1 lg:px-0 lg:pt-0">
                            <Link
                                href={route('tienda.index', { filter: 'combos' })}
                                className="mb-3 inline-flex min-h-8 items-center text-xs font-medium text-[#6000ca] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca]"
                            >
                                Ver más combos
                            </Link>
                            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[#737373]">
                                <span>Tienda Chisperío</span>
                                <span aria-hidden="true">·</span>
                                <span>Combo</span>
                                {combo.is_featured && (
                                    <>
                                        <span aria-hidden="true">·</span>
                                        <span>Combo destacado</span>
                                    </>
                                )}
                            </div>
                            <h1 className="text-[19px] font-medium leading-snug tracking-[-0.015em] lg:text-2xl lg:font-semibold">
                                {combo.titulo}
                            </h1>
                        </div>
                        <div className="order-2 min-w-0 pt-3 lg:order-1 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-stretch lg:pt-0">
                            <StickyGallery offset={128}>
                                <ProductGallery imagenes={combo.imagenes} videos={combo.videos} titulo={combo.titulo} />
                            </StickyGallery>
                        </div>
                        <div className="order-3 min-w-0 px-4 pb-7 pt-5 sm:px-6 lg:col-start-2 lg:row-start-2 lg:px-0 lg:pb-0 lg:pt-5">
                            <div aria-live="polite" aria-atomic="true">
                                {tieneDescuento && (
                                    <p className="mb-1 text-sm text-[#737373] line-through">
                                        {formatPrice(precioInfo.precioBase)}
                                    </p>
                                )}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <p className="text-[36px] font-medium leading-tight tracking-[-0.04em] lg:text-[40px]">
                                        {formatPrice(precioInfo.precioFinalConOpciones)}
                                    </p>
                                    {tieneDescuento && (
                                        <span className="text-sm font-semibold text-[#008744]">
                                            {ahorroPorcentaje}% OFF
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-xs leading-relaxed text-[#737373]">Precio por combo.</p>
                            </div>
                            <ProductPaymentOptions
                                planes={planesPagoActivos}
                                planSeleccionado={planPagoSeleccionado}
                                recargoInfo={recargoInfo}
                                total={totalCombo}
                                qty={qty}
                                incompleto={false}
                                onSelect={togglePlanPago}
                            />
                            {!agotado &&
                                (combo.envio_gratis ? (
                                    <div className="flex items-start gap-3 py-4">
                                        <Truck className="mt-0.5 h-5 w-5 shrink-0 text-[#008744]" aria-hidden="true" />
                                        <div>
                                            <p className="text-sm font-semibold text-[#008744]">
                                                Envío gratis comprando solo este combo
                                            </p>
                                            <p className="mt-1 text-xs leading-relaxed text-[#737373]">
                                                Si sumás otros productos al pedido, este beneficio deja de aplicar
                                                {montoMinimoEnvio > 0
                                                    ? ` y rige el envío gratis desde ${formatPrice(montoMinimoEnvio)} de compra.`
                                                    : '.'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <ProductDeliveryInfo montoMinimo={montoMinimoEnvio} total={totalCombo} />
                                ))}
                            {agotado ? (
                                <div className="mt-5 rounded-lg bg-[#f5f5f5] p-4">
                                    <p className="text-sm font-semibold text-[#ba1a1a]">Sin stock</p>
                                    <p className="mt-2 text-sm leading-relaxed text-[#737373]">
                                        Este combo no tiene unidades disponibles en este momento.
                                    </p>
                                    <Link
                                        href={route('tienda.index', { filter: 'combos' })}
                                        className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#6000ca]"
                                    >
                                        Ver otros combos <ArrowIcon />
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <p className={`mt-3 text-sm font-semibold ${stockBajo ? 'text-[#a15c00]' : ''}`}>
                                        {stockBajo
                                            ? topeCantidad === 1
                                                ? '¡Último combo disponible!'
                                                : `Quedan ${topeCantidad} combos`
                                            : 'Stock disponible'}
                                    </p>
                                    <div className="mt-3 rounded-lg bg-[#f5f5f5] p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="text-sm">
                                                <span className="font-medium">Cantidad: {qty}</span>
                                                {topeCantidad !== null && (
                                                    <span className="ml-2 text-xs text-[#737373]">
                                                        ({topeCantidad} disponibles)
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center rounded-md border border-black/10 bg-white">
                                                <button
                                                    type="button"
                                                    onClick={() => cambiarQty(qty - 1)}
                                                    disabled={qty <= 1}
                                                    aria-label="Reducir cantidad"
                                                    className="flex h-11 w-11 items-center justify-center rounded-l-md text-xl text-[#6000ca] hover:bg-[#6000ca]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] disabled:cursor-not-allowed disabled:text-black/20"
                                                >
                                                    −
                                                </button>
                                                <span
                                                    className="min-w-8 text-center text-sm font-semibold"
                                                    aria-live="polite"
                                                >
                                                    {qty}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => cambiarQty(qty + 1)}
                                                    disabled={topeCantidad !== null && qty >= topeCantidad}
                                                    aria-label="Aumentar cantidad"
                                                    className="flex h-11 w-11 items-center justify-center rounded-r-md text-xl text-[#6000ca] hover:bg-[#6000ca]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] disabled:cursor-not-allowed disabled:text-black/20"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    {(combo.items ?? []).length > 0 && (
                                        <div className="mt-5">
                                            <h2 className="mb-3 text-sm font-medium">Este combo incluye</h2>
                                            <ul className="space-y-2">
                                                {(combo.items ?? []).map((item) => {
                                                    const requiereEleccion =
                                                        item.producto_variante_id === null &&
                                                        (item.producto?.variantes_activas?.length ?? 0) > 0;
                                                    const varianteFija = item.producto_variante;

                                                    return (
                                                        <li key={item.id} className="rounded-lg bg-[#f5f5f5] p-3">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <p className="min-w-0 text-sm font-medium">
                                                                    {item.cantidad} × {item.producto?.titulo}
                                                                </p>
                                                                {varianteFija && (
                                                                    <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs font-medium text-[#4b4356]">
                                                                        <span
                                                                            className="h-3 w-3 rounded-full border border-black/10"
                                                                            style={{
                                                                                backgroundColor:
                                                                                    varianteFija.color_hex || '#ccc',
                                                                            }}
                                                                        />
                                                                        {varianteFija.nombre}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {requiereEleccion && (
                                                                <div className="mt-3">
                                                                    <VarianteColorSwatches
                                                                        variantes={item.producto.variantes_activas}
                                                                        value={selecciones[item.id] ?? null}
                                                                        onChange={(varianteId) =>
                                                                            setSeleccionItem(item.id, varianteId)
                                                                        }
                                                                        colorPersonalizado=""
                                                                        textoPersonalizado=""
                                                                        onColorPersonalizadoChange={() => {}}
                                                                        onTextoPersonalizadoChange={() => {}}
                                                                    />
                                                                </div>
                                                            )}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    )}
                                    {qty > 1 && (
                                        <div
                                            className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1"
                                            aria-live="polite"
                                            aria-atomic="true"
                                        >
                                            <p className="text-sm text-[#737373]">Total por {qty} combos</p>
                                            <p className="text-xl font-semibold">{formatPrice(totalCombo)}</p>
                                        </div>
                                    )}
                                    <div className="mt-5 space-y-3">
                                        <button
                                            type="button"
                                            onClick={() => handleAddToCart(true)}
                                            disabled={!puedeAgregar}
                                            aria-describedby={!puedeAgregar ? 'seleccion-combo-aviso' : undefined}
                                            className="flex min-h-12 w-full items-center justify-center rounded-md bg-[#6000ca] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#4f00a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#e5e5e5] disabled:text-[#737373]"
                                        >
                                            Comprar ahora
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleAddToCart()}
                                            disabled={!puedeAgregar}
                                            aria-describedby={!puedeAgregar ? 'seleccion-combo-aviso' : undefined}
                                            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#6000ca]/[0.08] px-4 py-3 text-sm font-semibold text-[#6000ca] transition-colors hover:bg-[#6000ca]/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#f5f5f5] disabled:text-[#737373]"
                                        >
                                            <ShoppingCart className="h-[18px] w-[18px]" aria-hidden="true" /> Agregar al
                                            carrito
                                        </button>
                                    </div>
                                    {!puedeAgregar && (
                                        <p
                                            id="seleccion-combo-aviso"
                                            role="status"
                                            className="mt-3 text-xs leading-relaxed text-[#ba1a1a]"
                                        >
                                            Elegí los colores del combo para continuar.
                                        </p>
                                    )}
                                    <p className="mt-3 text-center text-xs leading-relaxed text-[#737373]">
                                        Completá tus datos y coordiná el pago por WhatsApp.
                                    </p>
                                </>
                            )}
                            <ProductSellerInfo tieneResenas={resenas.length > 0} />
                        </div>
                    </section>
                    {combo.descripcion && (
                        <section
                            className="border-t border-black/10 px-4 py-8 sm:px-6 lg:px-8"
                            aria-labelledby="descripcion-combo"
                        >
                            <h2 id="descripcion-combo" className="mb-5 text-lg font-medium">
                                Lo que tenés que saber de este combo
                            </h2>
                            <p className="max-w-3xl whitespace-pre-line break-words text-sm leading-7 text-[#4b4356]">
                                {combo.descripcion}
                            </p>
                        </section>
                    )}
                </div>
                <div id="opiniones-clientes" className="scroll-mt-36">
                    <ResenasConfianza resenas={resenas} compact />
                </div>
            </main>
            <LandingFooter />
            {toast && (
                <div
                    role="status"
                    aria-live="polite"
                    className="fixed bottom-24 left-1/2 z-[100] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-lg bg-[#1c1b1b] px-4 py-3 text-xs text-white shadow-xl md:bottom-8"
                >
                    <span className="min-w-0">{toast}</span>
                    <Link
                        href={route('carrito.index')}
                        className="shrink-0 rounded py-2 font-semibold text-white underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                        Ver carrito
                    </Link>
                </div>
            )}
        </div>
    );
}
