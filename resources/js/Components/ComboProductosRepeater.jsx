import { useState } from 'react';
import ProductoPickerModal from '@/Components/ProductoPickerModal';

const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(precio);

function generarClave() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Valida el array de items del combo en cliente: cada fila necesita un producto y
 * una cantidad >= 1. La pertenencia de la variante fija al producto la valida el
 * backend (ComboController::sincronizarItems) — acá alcanza con lo básico para no
 * dejar mandar un combo vacío o con cantidades inválidas.
 */
export function validarComboItems(items) {
    let esValido = items.filter((i) => !i._eliminar).length > 0;

    const errores = items.map((item) => {
        const fila = {};

        if (!item.producto_id) {
            fila.producto_id = 'Elegí un producto.';
        }

        const cantidad = Number(item.cantidad);
        if (!item.cantidad || !Number.isInteger(cantidad) || cantidad < 1) {
            fila.cantidad = 'La cantidad debe ser un entero mayor o igual a 1.';
        }

        if (!item._eliminar && (fila.producto_id || fila.cantidad)) {
            esValido = false;
        }

        return fila;
    });

    return { esValido, errores };
}

/**
 * Filtra las filas marcadas para eliminar antes de mandar el payload, mismo patrón
 * que limpiarVariantesParaEnviar.
 */
export function limpiarComboItemsParaEnviar(items) {
    return items
        .filter((item) => !item._eliminar)
        .map(({ _eliminar, clave, ...resto }) => resto);
}

/**
 * Card de preview del producto elegido en una fila: imagen + título + precio, con un
 * botón para reabrir el picker y cambiarlo. Sin producto elegido todavía, muestra un
 * placeholder punteado que invita a elegir uno.
 */
function ProductoPreview({ producto, onElegir }) {
    if (!producto) {
        return (
            <button
                type="button"
                onClick={onElegir}
                className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-gray-300 p-2.5 text-left hover:border-[#6000ca] hover:bg-[#6000ca]/5 transition-all"
            >
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </span>
                <span className="text-sm font-semibold text-gray-500">Elegir producto...</span>
            </button>
        );
    }

    const ruta = producto.imagen_principal?.ruta;

    return (
        <button
            type="button"
            onClick={onElegir}
            className="group flex w-full items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-2.5 text-left hover:border-[#6000ca] transition-all"
        >
            <span className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50">
                {ruta ? (
                    <img src={`/${ruta}`} alt={producto.titulo} className="h-full w-full object-contain p-1" />
                ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm font-black text-gray-300">
                        {producto.titulo.charAt(0).toUpperCase()}
                    </span>
                )}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-gray-800">{producto.titulo}</span>
                <span className="block text-xs font-semibold text-[#6000ca]">{formatearPrecio(producto.precio)}</span>
            </span>
            <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide text-gray-400 group-hover:text-[#6000ca]">
                Cambiar
            </span>
        </button>
    );
}

/**
 * Repeater de "Productos del combo" para Admin/Combos/Create y Edit: mismo ciclo de
 * vida de fila que VariantesColorRepeater (agregar/quitar con deshacer/reordenar),
 * pero el producto de cada fila se elige desde una previsualización en formato de
 * cards (ProductoPickerModal) en vez de un <select> de texto — un mismo producto
 * puede repetirse en dos filas (p. ej. con distinta variante fija cada una).
 */
export default function ComboProductosRepeater({ items, onChange, errors = {}, productosDisponibles = [] }) {
    const itemsVisibles = items.filter((i) => !i._eliminar);
    // null = cerrado, 'nuevo' = agregando una fila nueva, número = cambiando el
    // producto de la fila en ese índice.
    const [pickerPara, setPickerPara] = useState(null);

    const productoPorId = (id) => productosDisponibles.find((p) => p.id === Number(id));

    const actualizar = (index, campo, valor) => {
        onChange(items.map((item, i) => (i === index ? { ...item, [campo]: valor } : item)));
    };

    const elegirProducto = (producto) => {
        if (pickerPara === 'nuevo') {
            onChange([...items, {
                producto_id: producto.id,
                cantidad: 1,
                producto_variante_id: '',
                clave: generarClave(),
            }]);
        } else if (pickerPara !== null) {
            onChange(items.map((item, i) => (
                i === pickerPara
                    // Cambiar de producto invalida cualquier variante fija que hubiera elegido.
                    ? { ...item, producto_id: producto.id, producto_variante_id: '' }
                    : item
            )));
        }
        setPickerPara(null);
    };

    const quitar = (index) => {
        const item = items[index];
        if (!item.id) {
            onChange(items.filter((_, i) => i !== index));
            return;
        }
        onChange(items.map((it, i) => (i === index ? { ...it, _eliminar: true } : it)));
    };

    const deshacerEliminar = (index) => {
        onChange(items.map((it, i) => (i === index ? { ...it, _eliminar: false } : it)));
    };

    const subir = (index) => {
        let prev = index - 1;
        while (prev >= 0 && items[prev]._eliminar) prev -= 1;
        if (prev < 0) return;
        const nuevos = [...items];
        [nuevos[index], nuevos[prev]] = [nuevos[prev], nuevos[index]];
        onChange(nuevos);
    };

    const bajar = (index) => {
        let next = index + 1;
        while (next < items.length && items[next]._eliminar) next += 1;
        if (next >= items.length) return;
        const nuevos = [...items];
        [nuevos[index], nuevos[next]] = [nuevos[next], nuevos[index]];
        onChange(nuevos);
    };

    return (
        <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
                <svg className="h-5 w-5 mr-2 text-[#6000ca]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12V8H4v4m16 0v8H4v-8m16 0h-2.5m-13.5 0H4M12 3v5m0 0L9.5 5.5M12 8l2.5-2.5" />
                </svg>
                Productos del combo <span className="text-[#6000ca]">*</span>
            </h3>
            <p className="text-sm text-gray-500 mb-4">
                Elegí qué productos entran en el combo, cuántas unidades de cada uno, y opcionalmente fijá un color puntual —
                si no fijás ninguno y el producto tiene colores activos, el cliente elige al agregar el combo al carrito.
            </p>

            {items.length > 0 && (
                <div className="space-y-3 mb-4">
                    {(() => {
                        let visibleIndex = -1;

                        return items.map((item, index) => {
                            if (item._eliminar) {
                                const producto = productoPorId(item.producto_id);
                                return (
                                    <div key={item.id ?? item.clave ?? index} className="p-4 bg-red-50 border-2 border-dashed border-red-200 rounded-xl">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm text-red-700">
                                                <span className="font-bold">{producto?.titulo || 'Producto'}</span>
                                                {' '}— se quitará del combo al guardar
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => deshacerEliminar(index)}
                                                className="flex-shrink-0 text-xs font-bold text-red-700 underline hover:text-red-900"
                                            >
                                                Deshacer
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            visibleIndex += 1;
                            const posicionActual = visibleIndex;
                            const producto = productoPorId(item.producto_id);
                            const variantesDelProducto = producto?.variantes_activas ?? [];
                            const errorProducto = errors[`items.${posicionActual}.producto_id`];
                            const errorCantidad = errors[`items.${posicionActual}.cantidad`];
                            const errorVariante = errors[`items.${posicionActual}.producto_variante_id`];

                            return (
                                <div key={item.id ?? item.clave ?? index} className="admin-card p-4 bg-white border-2 border-gray-200 rounded-xl">
                                    <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1.5fr_auto] gap-3 items-start">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
                                                Producto
                                            </label>
                                            <ProductoPreview producto={producto} onElegir={() => setPickerPara(index)} />
                                            {errorProducto && <p className="mt-1 text-xs text-red-600">{errorProducto}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
                                                Cantidad
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={item.cantidad}
                                                onChange={(e) => actualizar(index, 'cantidad', e.target.value)}
                                                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#6000ca] focus:ring focus:ring-[#6000ca] focus:ring-opacity-50 transition-all"
                                            />
                                            {errorCantidad && <p className="mt-1 text-xs text-red-600">{errorCantidad}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
                                                Color fijo
                                            </label>
                                            {variantesDelProducto.length > 0 ? (
                                                <select
                                                    value={item.producto_variante_id || ''}
                                                    onChange={(e) => actualizar(index, 'producto_variante_id', e.target.value)}
                                                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#6000ca] focus:ring focus:ring-[#6000ca] focus:ring-opacity-50 transition-all"
                                                >
                                                    <option value="">El comprador elige</option>
                                                    {variantesDelProducto.map((v) => (
                                                        <option key={v.id} value={v.id}>{v.nombre}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <p className="text-xs text-gray-400 italic pt-2">
                                                    {item.producto_id ? 'Sin colores' : '—'}
                                                </p>
                                            )}
                                            {errorVariante && <p className="mt-1 text-xs text-red-600">{errorVariante}</p>}
                                        </div>

                                        <div className="flex sm:flex-col items-center gap-1 sm:pt-5">
                                            <button
                                                type="button"
                                                onClick={() => subir(index)}
                                                disabled={posicionActual === 0}
                                                className="p-1 text-gray-400 hover:text-[#6000ca] disabled:opacity-30 disabled:cursor-not-allowed"
                                                aria-label="Subir item"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => bajar(index)}
                                                disabled={posicionActual === itemsVisibles.length - 1}
                                                className="p-1 text-gray-400 hover:text-[#6000ca] disabled:opacity-30 disabled:cursor-not-allowed"
                                                aria-label="Bajar item"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => quitar(index)}
                                                className="admin-delete p-1 text-red-500 hover:bg-red-50 rounded-lg transition-all hover:scale-110"
                                                aria-label="Quitar item"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            )}

            {errors.items && typeof errors.items === 'string' && (
                <p className="mb-3 text-sm text-red-600">{errors.items}</p>
            )}

            <button
                type="button"
                onClick={() => setPickerPara('nuevo')}
                className="inline-flex items-center px-4 py-2 bg-white border-2 border-dashed border-[#6000ca]/50 rounded-xl font-semibold text-sm text-[#6000ca] hover:bg-[#6000ca]/5 transition-all"
            >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar producto al combo
            </button>

            <ProductoPickerModal
                show={pickerPara !== null}
                productos={productosDisponibles}
                onSelect={elegirProducto}
                onClose={() => setPickerPara(null)}
            />
        </div>
    );
}
