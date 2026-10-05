import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';

const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(precio);

const redondear = (valor) => Math.round((Number(valor) + Number.EPSILON) * 100) / 100;

const inputClase =
    'mt-1 block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-[#40B0C2] focus:ring-[#40B0C2]';

function Campo({ label, error, children, className = '' }) {
    return (
        <div className={className}>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</label>
            {children}
            <InputError message={error} className="mt-1" />
        </div>
    );
}

/** Estado inicial de cada línea del form a partir del item guardado. */
const itemInicial = (item) => ({
    id: item.id,
    cantidad: item.cantidad,
    precio_unitario: String(item.precio_unitario),
    variante_id: item.producto_variante_id ?? '',
    color_personalizado_texto: item.color_personalizado_texto ?? '',
    addons_textos: Object.fromEntries(
        (item.addons_seleccionados ?? []).map((addon, i) => [i, addon.texto_personalizado ?? ''])
    ),
    componentes_variantes: Object.fromEntries(
        (item.combo_items_seleccionados ?? []).map((componente, i) => [i, componente.producto_variante_id ?? ''])
    ),
    quitado: false,
});

export default function Edit({ pedido, variantesPorProducto }) {
    const { data, setData, put, processing, errors, transform } = useForm({
        cliente_nombre: pedido.cliente_nombre ?? '',
        cliente_dni: pedido.cliente_dni ?? '',
        cliente_telefono: pedido.cliente_telefono ?? '',
        cliente_email: pedido.cliente_email ?? '',
        cliente_provincia: pedido.cliente_provincia ?? '',
        cliente_ciudad: pedido.cliente_ciudad ?? '',
        cliente_codigo_postal: pedido.cliente_codigo_postal ?? '',
        observaciones: pedido.observaciones ?? '',
        items: pedido.items.map(itemInicial),
    });

    // Las líneas quitadas no se mandan: el servidor interpreta "no vino" como "se quitó".
    transform((formData) => ({
        ...formData,
        items: formData.items
            .filter((item) => !item.quitado)
            .map(({ quitado, ...resto }) => resto),
    }));

    const variantesDe = (productoId) => variantesPorProducto?.[productoId] ?? [];

    const actualizarItem = (indice, cambios) =>
        setData(
            'items',
            data.items.map((item, i) => (i === indice ? { ...item, ...cambios } : item))
        );

    /**
     * Al cambiar la variante de un producto se sugiere el nuevo precio (el actual más la
     * diferencia de recargo entre variantes). Es solo una sugerencia: queda editable, y
     * el servidor guarda el precio que se mande.
     */
    const cambiarVariante = (indice, item, guardado, nuevoId) => {
        const variantes = variantesDe(guardado.producto_id);
        const nueva = variantes.find((v) => String(v.id) === String(nuevoId));
        const actual = variantes.find((v) => String(v.id) === String(item.variante_id));
        const recargoActual = Number(actual?.precio_adicional ?? 0);
        const recargoNuevo = Number(nueva?.precio_adicional ?? 0);

        actualizarItem(indice, {
            variante_id: nuevoId,
            precio_unitario: String(
                Math.max(0, redondear(Number(item.precio_unitario || 0) - recargoActual + recargoNuevo))
            ),
        });
    };

    // Vista previa de totales: espeja PedidoEdicionService::recalcularTotales (que es
    // la que manda al guardar) para que se vea el efecto de los cambios antes de guardar.
    const lineas = data.items.filter((item) => !item.quitado);
    const subtotal = redondear(
        lineas.reduce((acc, item) => acc + redondear(Number(item.precio_unitario || 0) * Number(item.cantidad || 0)), 0)
    );

    let descuento = Number(pedido.descuento_monto || 0);
    if (pedido.codigo_descuento_texto && pedido.codigo_descuento_tipo && pedido.codigo_descuento_valor != null) {
        const valor = Number(pedido.codigo_descuento_valor);
        descuento = redondear(
            Math.max(0, pedido.codigo_descuento_tipo === 'porcentaje' ? subtotal * (valor / 100) : Math.min(valor, subtotal))
        );
    }

    const total = redondear(Math.max(0, subtotal - descuento));
    const conTarjeta = Boolean(pedido.plan_pago_tarjeta_id);
    const recargo = conTarjeta ? redondear(total * (Number(pedido.recargo_porcentaje) / 100)) : 0;
    const montoMinimoEnvio = Number(pedido.envio_gratis_monto_minimo || 0);
    // Igual que PedidoEdicionService: por monto, o porque lo que queda son solo combos con envío gratis.
    const lineasGuardadas = data.items.map((item, i) => ({ item, guardado: pedido.items[i] })).filter(({ item }) => !item.quitado);
    const envioGratisPorCombo =
        lineasGuardadas.length > 0 && lineasGuardadas.every(({ guardado }) => guardado.combo_id !== null && guardado.envio_gratis);
    const hayEnvioGratisConfigurado = montoMinimoEnvio > 0 || envioGratisPorCombo;
    const envioGratis = hayEnvioGratisConfigurado ? (montoMinimoEnvio > 0 && subtotal >= montoMinimoEnvio) || envioGratisPorCombo : null;
    const enviar = (e) => {
        e.preventDefault();
        put(route('pedidos.update', pedido.id), { preserveScroll: true });
    };

    let indiceEnviado = 0;

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <Link
                        href={route('pedidos.show', pedido.id)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-[#40B0C2] transition-colors mb-2"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Volver al pedido
                    </Link>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                        Editar pedido #{pedido.id}
                    </h2>
                </div>
            }
        >
            <Head title={`Editar pedido #${pedido.id}`} />

            <form onSubmit={enviar} className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                    {(errors.estado || errors.items) && (
                        <div className="px-4 sm:px-0">
                            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                                {errors.estado || errors.items}
                            </div>
                        </div>
                    )}

                    {/* Datos del cliente */}
                    <div className="px-4 sm:px-0">
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-5">Datos del cliente</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                <Campo label="Nombre" error={errors.cliente_nombre}>
                                    <input className={inputClase} value={data.cliente_nombre} onChange={(e) => setData('cliente_nombre', e.target.value)} required />
                                </Campo>
                                <Campo label="DNI" error={errors.cliente_dni}>
                                    <input className={inputClase} value={data.cliente_dni} onChange={(e) => setData('cliente_dni', e.target.value)} />
                                </Campo>
                                <Campo label="Correo electrónico" error={errors.cliente_email}>
                                    <input type="email" className={inputClase} value={data.cliente_email} onChange={(e) => setData('cliente_email', e.target.value)} />
                                </Campo>
                                <Campo label="Teléfono" error={errors.cliente_telefono}>
                                    <input className={inputClase} value={data.cliente_telefono} onChange={(e) => setData('cliente_telefono', e.target.value)} />
                                </Campo>
                                <Campo label="Provincia" error={errors.cliente_provincia}>
                                    <input className={inputClase} value={data.cliente_provincia} onChange={(e) => setData('cliente_provincia', e.target.value)} />
                                </Campo>
                                <Campo label="Ciudad" error={errors.cliente_ciudad}>
                                    <input className={inputClase} value={data.cliente_ciudad} onChange={(e) => setData('cliente_ciudad', e.target.value)} />
                                </Campo>
                                <Campo label="Código postal" error={errors.cliente_codigo_postal}>
                                    <input className={inputClase} value={data.cliente_codigo_postal} onChange={(e) => setData('cliente_codigo_postal', e.target.value)} />
                                </Campo>
                                <Campo label="Observaciones" error={errors.observaciones} className="sm:col-span-2 lg:col-span-3">
                                    <textarea rows={3} className={inputClase} value={data.observaciones} onChange={(e) => setData('observaciones', e.target.value)} />
                                </Campo>
                            </div>
                        </div>
                    </div>

                    {/* Productos */}
                    <div className="px-4 sm:px-0">
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900">Productos del pedido</h3>
                            <p className="mt-1 mb-5 text-sm text-gray-500">
                                El precio unitario se guarda tal cual lo cargues: no se recalcula por escalas ni
                                ofertas. Al cambiar el color se sugiere el precio con la diferencia de recargo, pero
                                podés ajustarlo. El stock se corrige solo con la diferencia.
                            </p>

                            <div className="space-y-4">
                                {data.items.map((item, indice) => {
                                    const guardado = pedido.items[indice];
                                    const ruta = guardado.producto?.imagen_principal?.ruta;
                                    const esCombo = guardado.combo_id !== null;
                                    const variantes = variantesDe(guardado.producto_id);
                                    const varianteElegida = variantes.find((v) => String(v.id) === String(item.variante_id));
                                    const pideColorTexto = Boolean(varianteElegida?.es_color_personalizado);
                                    const idx = item.quitado ? null : indiceEnviado++;
                                    const err = (campo) => (idx === null ? undefined : errors[`items.${idx}.${campo}`]);
                                    const subtotalLinea = redondear(Number(item.precio_unitario || 0) * Number(item.cantidad || 0));

                                    return (
                                        <div
                                            key={item.id}
                                            className={`rounded-xl border p-4 ${item.quitado ? 'border-red-200 bg-red-50/50 opacity-70' : 'border-gray-200'}`}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-[#40B0C2]/20 to-[#A72DAB]/20 border border-gray-200 flex items-center justify-center">
                                                    {ruta && <img src={`/${ruta}`} alt={guardado.titulo} className="w-full h-full object-cover" />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {guardado.titulo}
                                                        {esCombo && (
                                                            <span className="ml-2 inline-flex items-center rounded-full bg-[#40B0C2]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#40B0C2]">
                                                                Combo
                                                            </span>
                                                        )}
                                                    </div>
                                                    {item.quitado && (
                                                        <div className="text-xs font-semibold text-red-600">Se quita del pedido al guardar</div>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => actualizarItem(indice, { quitado: !item.quitado })}
                                                    disabled={!item.quitado && lineas.length <= 1}
                                                    title={!item.quitado && lineas.length <= 1 ? 'El pedido necesita al menos un producto' : undefined}
                                                    className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:text-gray-300"
                                                >
                                                    {item.quitado ? 'Restaurar' : 'Quitar'}
                                                </button>
                                            </div>

                                            {!item.quitado && (
                                                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                                    {!esCombo && variantes.length > 0 && (
                                                        <Campo label="Color / variante" error={err('variante_id')} className="lg:col-span-2">
                                                            <select
                                                                className={inputClase}
                                                                value={item.variante_id}
                                                                onChange={(e) => cambiarVariante(indice, item, guardado, e.target.value)}
                                                            >
                                                                <option value="">Elegí una variante</option>
                                                                {variantes.map((v) => (
                                                                    <option key={v.id} value={v.id}>
                                                                        {v.nombre}
                                                                        {Number(v.precio_adicional) > 0 ? ` (+${formatearPrecio(v.precio_adicional)})` : ''}
                                                                        {v.stock !== null && v.stock <= 0 ? ' — sin stock' : ''}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </Campo>
                                                    )}

                                                    {!esCombo && pideColorTexto && (
                                                        <Campo label="Color solicitado" error={err('color_personalizado_texto')} className="lg:col-span-2">
                                                            <input
                                                                className={inputClase}
                                                                value={item.color_personalizado_texto}
                                                                onChange={(e) => actualizarItem(indice, { color_personalizado_texto: e.target.value })}
                                                            />
                                                        </Campo>
                                                    )}

                                                    {!esCombo &&
                                                        (guardado.addons_seleccionados ?? []).map((addon, posicion) =>
                                                            addon.texto_personalizado !== null && addon.texto_personalizado !== undefined ? (
                                                                <Campo
                                                                    key={posicion}
                                                                    label={`Texto de "${addon.nombre}"`}
                                                                    error={err(`addons_textos.${posicion}`)}
                                                                    className="lg:col-span-2"
                                                                >
                                                                    <input
                                                                        className={inputClase}
                                                                        value={item.addons_textos[posicion] ?? ''}
                                                                        onChange={(e) =>
                                                                            actualizarItem(indice, {
                                                                                addons_textos: { ...item.addons_textos, [posicion]: e.target.value },
                                                                            })
                                                                        }
                                                                    />
                                                                </Campo>
                                                            ) : null
                                                        )}

                                                    {esCombo &&
                                                        (guardado.combo_items_seleccionados ?? []).map((componente, posicion) => {
                                                            const opciones = variantesDe(componente.producto_id);

                                                            return opciones.length > 0 ? (
                                                                <Campo
                                                                    key={posicion}
                                                                    label={`${componente.cantidad_por_combo}x ${componente.titulo}`}
                                                                    error={err(`componentes_variantes.${posicion}`)}
                                                                    className="lg:col-span-2"
                                                                >
                                                                    <select
                                                                        className={inputClase}
                                                                        value={item.componentes_variantes[posicion] ?? ''}
                                                                        onChange={(e) =>
                                                                            actualizarItem(indice, {
                                                                                componentes_variantes: { ...item.componentes_variantes, [posicion]: e.target.value },
                                                                            })
                                                                        }
                                                                    >
                                                                        <option value="">Elegí una variante</option>
                                                                        {opciones.map((v) => (
                                                                            <option key={v.id} value={v.id}>
                                                                                {v.nombre}
                                                                                {v.stock !== null && v.stock <= 0 ? ' — sin stock' : ''}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </Campo>
                                                            ) : null;
                                                        })}

                                                    <Campo label={esCombo ? 'Cantidad de combos' : 'Cantidad'} error={err('cantidad')}>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            step="1"
                                                            className={inputClase}
                                                            value={item.cantidad}
                                                            onChange={(e) => actualizarItem(indice, { cantidad: e.target.value })}
                                                        />
                                                    </Campo>

                                                    <Campo label="Precio unitario" error={err('precio_unitario')}>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            className={inputClase}
                                                            value={item.precio_unitario}
                                                            onChange={(e) => actualizarItem(indice, { precio_unitario: e.target.value })}
                                                        />
                                                    </Campo>

                                                    <div className="sm:col-span-2 lg:col-span-4 text-right text-sm text-gray-600">
                                                        Subtotal de la línea: <strong className="text-gray-900">{formatearPrecio(subtotalLinea)}</strong>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Totales */}
                    <div className="px-4 sm:px-0">
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Totales con los cambios</h3>
                            <dl className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-gray-600">Subtotal</dt>
                                    <dd className="font-semibold text-gray-900">{formatearPrecio(subtotal)}</dd>
                                </div>
                                {pedido.codigo_descuento_texto && (
                                    <div className="flex justify-between">
                                        <dt className="text-gray-600">Descuento ({pedido.codigo_descuento_texto})</dt>
                                        <dd className="font-semibold text-green-700">-{formatearPrecio(descuento)}</dd>
                                    </div>
                                )}
                                {conTarjeta && (
                                    <div className="flex justify-between">
                                        <dt className="text-gray-600">Recargo ({pedido.plan_pago_nombre})</dt>
                                        <dd className="font-semibold text-gray-900">+{formatearPrecio(recargo)}</dd>
                                    </div>
                                )}
                                {envioGratis !== null && (
                                    <div className="flex justify-between">
                                        <dt className="text-gray-600">
                                            Envío gratis{montoMinimoEnvio > 0 ? ` (mínimo ${formatearPrecio(montoMinimoEnvio)})` : ''}
                                            {envioGratisPorCombo && <span className="block text-xs text-gray-400">Por llevar solo combo(s) con envío gratis</span>}
                                        </dt>
                                        <dd className={`font-semibold ${envioGratis ? 'text-green-700' : 'text-gray-500'}`}>
                                            {envioGratis ? 'Sí' : 'No alcanza'}
                                        </dd>
                                    </div>
                                )}
                                <div className="flex justify-between border-t border-gray-100 pt-3 text-base">
                                    <dt className="font-bold text-gray-900">Total</dt>
                                    <dd className="font-bold text-gray-900">{formatearPrecio(conTarjeta ? total + recargo : total)}</dd>
                                </div>
                            </dl>
                            <p className="mt-3 text-xs text-gray-400">
                                Descuento, recargo y envío gratis se recalculan con las condiciones originales del pedido.
                            </p>
                        </div>
                    </div>

                    <div className="px-4 sm:px-0 flex flex-wrap justify-end gap-3">
                        <Link
                            href={route('pedidos.show', pedido.id)}
                            className="inline-flex items-center px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] text-white rounded-lg text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-50"
                        >
                            {processing ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                    </div>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}
