import InputError from '@/Components/InputError';
import { resolverPrecio } from '@/lib/pricing';

export const formatearPrecioLinea = (precio) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(precio);

const inputClase =
    'mt-1 block w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-[#6000ca] focus:ring-[#6000ca]';

function Campo({ label, error, children, className = '' }) {
    return (
        <div className={className}>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</label>
            {children}
            <InputError message={error} className="mt-1" />
        </div>
    );
}

/** Items de un combo en los que el cliente (acá, quien edita) tiene que elegir color. */
export const itemsConEleccion = (combo) =>
    (combo.items ?? []).filter(
        (item) => item.producto_variante_id === null && (item.producto?.variantes_activas?.length ?? 0) > 0
    );

/**
 * Precio unitario que sugiere el catálogo para una línea nueva: el de la ficha pública
 * (escala + oferta + color + add-ons) para un producto, el precio vigente del combo para
 * un combo. Es solo una sugerencia: quien edita puede dejar el que haya acordado.
 */
export function precioSugerido(linea, ref) {
    if (linea.tipo === 'combo') return Number(ref.precio_sugerido ?? ref.precio ?? 0);

    return resolverPrecio(
        ref,
        Number(linea.cantidad) || 1,
        linea.variante_id === '' ? null : Number(linea.variante_id),
        linea.addon_ids
    ).precioFinalConOpciones;
}

/** Línea nueva con los defaults de la ficha: primer color elegido y precio sugerido. */
export function crearLineaNueva(tipo, ref) {
    const base = {
        key: `nueva-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tipo,
        ref_id: ref.id,
        cantidad: 1,
        precio_manual: false,
        variante_id: tipo === 'producto' ? (ref.variantes?.[0]?.id ?? '') : '',
        color_personalizado_texto: '',
        addon_ids: [],
        addon_textos: {},
        selecciones:
            tipo === 'combo'
                ? Object.fromEntries(itemsConEleccion(ref).map((item) => [item.id, item.producto.variantes_activas[0].id]))
                : {},
    };

    return { ...base, precio_unitario: String(precioSugerido(base, ref)) };
}

/** Shape que espera PedidoController::actualizar en `nuevos_items`. */
export function lineaParaEnviar(linea) {
    const comun = {
        tipo: linea.tipo,
        cantidad: linea.cantidad,
        precio_unitario: linea.precio_unitario,
    };

    if (linea.tipo === 'combo') {
        return {
            ...comun,
            combo_id: linea.ref_id,
            selecciones: Object.entries(linea.selecciones).map(([comboProductoId, varianteId]) => ({
                combo_producto_id: Number(comboProductoId),
                variante_id: varianteId === '' ? null : Number(varianteId),
            })),
        };
    }

    return {
        ...comun,
        producto_id: linea.ref_id,
        variante_id: linea.variante_id === '' ? null : Number(linea.variante_id),
        color_personalizado_texto: linea.color_personalizado_texto,
        addons: linea.addon_ids.map((id) => ({
            addon_id: id,
            texto_personalizado: linea.addon_textos[id] ?? '',
        })),
    };
}

/**
 * Tarjeta de una línea que se suma al pedido (todavía no guardada). `onChange` recibe los
 * cambios parciales; el padre recalcula el precio sugerido mientras no se haya tocado a mano.
 */
export default function NuevaLineaPedido({ linea, referencia, onChange, onQuitar, error }) {
    const esCombo = linea.tipo === 'combo';
    const ruta = referencia.imagen_principal?.ruta;
    const variantes = esCombo ? [] : (referencia.variantes ?? []);
    const varianteElegida = variantes.find((v) => String(v.id) === String(linea.variante_id));
    const pideColorTexto = Boolean(varianteElegida?.es_color_personalizado);
    const addons = esCombo ? [] : (referencia.addons ?? []);
    const subtotal = Math.round((Number(linea.precio_unitario || 0) * Number(linea.cantidad || 0) + Number.EPSILON) * 100) / 100;

    const alternarAddon = (addonId) =>
        onChange({
            addon_ids: linea.addon_ids.includes(addonId)
                ? linea.addon_ids.filter((id) => id !== addonId)
                : [...linea.addon_ids, addonId],
        });

    return (
        <div className="rounded-xl border-2 border-dashed border-[#6000ca]/60 bg-[#6000ca]/[0.04] p-4">
            <div className="flex items-start gap-4">
                <div className="admin-card w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-white border border-gray-200 flex items-center justify-center">
                    {ruta && <img src={`/${ruta}`} alt={referencia.titulo} className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-900">
                        {referencia.titulo}
                        <span className="ml-2 inline-flex items-center rounded-full bg-[#6000ca] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                            {esCombo ? 'Combo nuevo' : 'Nuevo'}
                        </span>
                    </div>
                    <div className="text-xs text-gray-500">Se suma al pedido al guardar.</div>
                </div>
                <button type="button" onClick={onQuitar} className="admin-delete text-xs font-semibold text-red-600 hover:text-red-800">
                    Quitar
                </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {variantes.length > 0 && (
                    <Campo label="Color / variante" className="lg:col-span-2">
                        <select
                            className={inputClase}
                            value={linea.variante_id}
                            onChange={(e) => onChange({ variante_id: e.target.value })}
                        >
                            {variantes.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.nombre}
                                    {Number(v.precio_adicional) > 0 ? ` (+${formatearPrecioLinea(v.precio_adicional)})` : ''}
                                    {v.stock !== null && v.stock <= 0 ? ' — sin stock' : ''}
                                </option>
                            ))}
                        </select>
                    </Campo>
                )}

                {pideColorTexto && (
                    <Campo label="Color solicitado" className="lg:col-span-2">
                        <input
                            className={inputClase}
                            value={linea.color_personalizado_texto}
                            onChange={(e) => onChange({ color_personalizado_texto: e.target.value })}
                        />
                    </Campo>
                )}

                {esCombo &&
                    itemsConEleccion(referencia).map((item) => (
                        <Campo key={item.id} label={`${item.cantidad}x ${item.producto.titulo}`} className="lg:col-span-2">
                            <select
                                className={inputClase}
                                value={linea.selecciones[item.id] ?? ''}
                                onChange={(e) => onChange({ selecciones: { ...linea.selecciones, [item.id]: e.target.value } })}
                            >
                                {item.producto.variantes_activas.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.nombre}
                                        {v.stock !== null && v.stock <= 0 ? ' — sin stock' : ''}
                                    </option>
                                ))}
                            </select>
                        </Campo>
                    ))}

                {addons.length > 0 && (
                    <div className="sm:col-span-2 lg:col-span-4">
                        <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Personalizaciones
                        </span>
                        <div className="mt-2 space-y-2">
                            {addons.map((addon) => {
                                const marcado = linea.addon_ids.includes(addon.id);
                                const precioAddon = Number(addon.pivot?.precio_override ?? addon.precio);

                                return (
                                    <div key={addon.id} className="flex flex-wrap items-center gap-3">
                                        <label className="flex items-center gap-2 text-sm text-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={marcado}
                                                onChange={() => alternarAddon(addon.id)}
                                                className="h-4 w-4 rounded border-gray-300 text-[#6000ca] focus:ring-[#6000ca]"
                                            />
                                            {addon.nombre} (+{formatearPrecioLinea(precioAddon)})
                                        </label>
                                        {marcado && addon.requiere_texto && (
                                            <input
                                                className={`${inputClase} !mt-0 max-w-xs`}
                                                placeholder="Texto de la personalización"
                                                value={linea.addon_textos[addon.id] ?? ''}
                                                onChange={(e) =>
                                                    onChange({ addon_textos: { ...linea.addon_textos, [addon.id]: e.target.value } })
                                                }
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <Campo label={esCombo ? 'Cantidad de combos' : 'Cantidad'}>
                    <input
                        type="number"
                        min="1"
                        step="1"
                        className={inputClase}
                        value={linea.cantidad}
                        onChange={(e) => onChange({ cantidad: e.target.value })}
                    />
                </Campo>

                <Campo label="Precio unitario">
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={inputClase}
                        value={linea.precio_unitario}
                        onChange={(e) => onChange({ precio_unitario: e.target.value, precio_manual: true })}
                    />
                    {linea.precio_manual && (
                        <button
                            type="button"
                            onClick={() => onChange({ precio_manual: false })}
                            className="mt-1 text-xs font-semibold text-[#6000ca] hover:underline"
                        >
                            Volver al precio de catálogo
                        </button>
                    )}
                </Campo>

                <div className="sm:col-span-2 lg:col-span-4 text-right text-sm text-gray-600">
                    Subtotal de la línea: <strong className="text-gray-900">{formatearPrecioLinea(subtotal)}</strong>
                </div>
            </div>

            <InputError message={error} className="mt-2" />
        </div>
    );
}
