import { useMemo } from 'react';

function parseNumero(valor) {
    if (valor === '' || valor === null || valor === undefined) return null;
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
}

const HEX_VALIDO = /^#[0-9a-fA-F]{6}$/;

/**
 * Clave estable para vincular una fila de variante con sus imágenes/videos en el
 * gestor de multimedia, incluso antes de que la fila tenga un id real en base
 * (ver VariantesColorRepeater.agregar y Admin/Productos/Create|Edit.jsx).
 */
function generarClave() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Replica en cliente las reglas del backend (ProductoController::variantesReglas):
 * nombre requerido y único (case-insensitive) dentro del producto, precio_adicional
 * numérico >= 0 (o vacío), stock entero >= 0 o vacío (= ilimitado), y como máximo
 * una variante con es_color_personalizado activo. Devuelve { esValido, errores }
 * donde errores es un array paralelo a `variantes`.
 */
export function validarVariantes(variantes) {
    const conteoPorNombre = new Map();
    variantes.forEach((variante) => {
        const nombre = (variante.nombre || '').trim().toLowerCase();
        if (nombre) {
            conteoPorNombre.set(nombre, (conteoPorNombre.get(nombre) || 0) + 1);
        }
    });

    const totalPersonalizadas = variantes.filter((v) => !v._eliminar && v.es_color_personalizado).length;

    let esValido = true;

    const errores = variantes.map((variante) => {
        const fila = {};
        const nombre = (variante.nombre || '').trim();
        const precio = parseNumero(variante.precio_adicional);
        const stock = parseNumero(variante.stock);

        if (!nombre) {
            fila.nombre = 'El nombre de la variante es obligatorio.';
        } else if (conteoPorNombre.get(nombre.toLowerCase()) > 1) {
            fila.nombre = 'Hay otra variante con el mismo nombre.';
        }

        if (variante.precio_adicional !== '' && variante.precio_adicional !== null && variante.precio_adicional !== undefined) {
            if (precio === null || precio < 0) {
                fila.precio_adicional = 'Debe ser un número mayor o igual a 0.';
            }
        }

        if (variante.stock !== '' && variante.stock !== null && variante.stock !== undefined) {
            if (stock === null || !Number.isInteger(stock) || stock < 0) {
                fila.stock = 'Debe ser un número entero mayor o igual a 0, o vacío para ilimitado.';
            }
        }

        if (!variante._eliminar && variante.es_color_personalizado && totalPersonalizadas > 1) {
            fila.es_color_personalizado = 'Solo puede haber una variante marcada como "color a elección del cliente".';
        }

        if (fila.nombre || fila.precio_adicional || fila.stock || fila.es_color_personalizado) {
            esValido = false;
        }

        return fila;
    });

    return { esValido, errores };
}

/**
 * Filtra las variantes marcadas para eliminar (_eliminar) del payload que se manda
 * al backend, igual que limpiarEscalasParaEnviar. El orden final queda determinado
 * por la posición dentro del array resultante (ver ProductoController::sincronizarVariantes).
 */
export function limpiarVariantesParaEnviar(variantes) {
    return variantes
        .filter((variante) => !variante._eliminar)
        .map(({ _eliminar, ...resto }) => resto);
}

/**
 * Repeater de "Variantes de Color" para Admin/Productos/Create y Edit, calcado de
 * EscalasPrecioRepeater: filas nuevas (sin id) se quitan al instante al "Quitar";
 * filas persistidas (con id) se marcan con _eliminar y se filtran recién en el submit,
 * para poder mostrar/deshacer antes de guardar.
 *
 * El "reordenar" mueve la fila entera dentro del array (swap con la vecina visible
 * más cercana); el backend asigna `orden` según la posición final del array al sincronizar.
 */
export default function VariantesColorRepeater({ variantes, onChange, errors = {}, clavesConImagenPropia = new Set() }) {
    const variantesVisibles = variantes.filter((v) => !v._eliminar);
    const { errores: erroresCliente } = useMemo(() => validarVariantes(variantesVisibles), [variantesVisibles]);

    const actualizar = (index, campo, valor) => {
        // Como máximo una variante puede ser "color a elección del cliente": al tildar
        // una fila se destilda automáticamente cualquier otra que lo tuviera activo.
        if (campo === 'es_color_personalizado' && valor === true) {
            onChange(variantes.map((v, i) => ({ ...v, es_color_personalizado: i === index })));
            return;
        }
        onChange(variantes.map((v, i) => (i === index ? { ...v, [campo]: valor } : v)));
    };

    const agregar = () => {
        onChange([...variantes, {
            nombre: '',
            color_hex: '#40B0C2',
            es_color_personalizado: false,
            precio_adicional: '',
            stock: '',
            is_active: true,
            clave: generarClave(),
        }]);
    };

    const quitar = (index) => {
        const variante = variantes[index];
        if (!variante.id) {
            onChange(variantes.filter((_, i) => i !== index));
            return;
        }
        onChange(variantes.map((v, i) => (i === index ? { ...v, _eliminar: true } : v)));
    };

    const deshacerEliminar = (index) => {
        onChange(variantes.map((v, i) => (i === index ? { ...v, _eliminar: false } : v)));
    };

    const subir = (index) => {
        let prev = index - 1;
        while (prev >= 0 && variantes[prev]._eliminar) prev -= 1;
        if (prev < 0) return;
        const nuevas = [...variantes];
        [nuevas[index], nuevas[prev]] = [nuevas[prev], nuevas[index]];
        onChange(nuevas);
    };

    const bajar = (index) => {
        let next = index + 1;
        while (next < variantes.length && variantes[next]._eliminar) next += 1;
        if (next >= variantes.length) return;
        const nuevas = [...variantes];
        [nuevas[index], nuevas[next]] = [nuevas[next], nuevas[index]];
        onChange(nuevas);
    };

    return (
        <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
                <svg className="h-5 w-5 mr-2 text-[#6000ca]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm10 0a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4z" />
                </svg>
                Variantes de Color
            </h3>
            <p className="text-sm text-gray-500 mb-4">
                Opcional. Si cargás variantes, el cliente elige una al comprar. Un producto sin variantes se sigue vendiendo igual que hoy, por el precio y el stock propios del producto.
            </p>

            {variantes.length > 0 && (
                <div className="space-y-3 mb-4">
                    {(() => {
                        let visibleIndex = -1;

                        return variantes.map((variante, index) => {
                            if (variante._eliminar) {
                                return (
                                    <div
                                        key={variante.id ?? index}
                                        className="p-4 bg-red-50 border-2 border-dashed border-red-200 rounded-xl"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm text-red-700">
                                                <span className="font-bold">{variante.nombre || 'Variante'}</span>
                                                {' '}— se eliminará al guardar
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
                            const errorCliente = erroresCliente[posicionActual] || {};
                            const errorNombre = errors[`variantes.${posicionActual}.nombre`] || errorCliente.nombre;
                            const errorPrecio = errors[`variantes.${posicionActual}.precio_adicional`] || errorCliente.precio_adicional;
                            const errorStock = errors[`variantes.${posicionActual}.stock`] || errorCliente.stock;
                            const errorPersonalizado = errors[`variantes.${posicionActual}.es_color_personalizado`] || errorCliente.es_color_personalizado;
                            const colorPreview = HEX_VALIDO.test(variante.color_hex || '') ? variante.color_hex : '#ffffff';
                            const sinImagenPropia = variante.clave && !clavesConImagenPropia.has(variante.clave);

                            return (
                                <div key={variante.id ?? index} className="admin-card p-4 bg-white border-2 border-gray-200 rounded-xl">
                                    <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto_auto] gap-3 items-start">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
                                                Nombre
                                            </label>
                                            <input
                                                type="text"
                                                value={variante.nombre}
                                                onChange={(e) => actualizar(index, 'nombre', e.target.value)}
                                                placeholder="Ej: Rojo"
                                                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#6000ca] focus:ring focus:ring-[#6000ca] focus:ring-opacity-50 transition-all"
                                            />
                                            {errorNombre && <p className="mt-1 text-xs text-red-600">{errorNombre}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
                                                Color
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={colorPreview}
                                                    onChange={(e) => actualizar(index, 'color_hex', e.target.value)}
                                                    className="h-10 w-10 rounded-lg border border-gray-300 cursor-pointer p-0"
                                                    aria-label="Seleccionar color"
                                                />
                                                <input
                                                    type="text"
                                                    value={variante.color_hex || ''}
                                                    onChange={(e) => actualizar(index, 'color_hex', e.target.value)}
                                                    placeholder="#FF0000"
                                                    maxLength={7}
                                                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#6000ca] focus:ring focus:ring-[#6000ca] focus:ring-opacity-50 transition-all"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
                                                Precio adicional
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={variante.precio_adicional}
                                                    onChange={(e) => actualizar(index, 'precio_adicional', e.target.value)}
                                                    className="block w-full pl-8 rounded-xl border-gray-300 shadow-sm focus:border-[#6000ca] focus:ring focus:ring-[#6000ca] focus:ring-opacity-50 transition-all"
                                                />
                                            </div>
                                            {errorPrecio && <p className="mt-1 text-xs text-red-600">{errorPrecio}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
                                                Stock
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={variante.stock ?? ''}
                                                onChange={(e) => actualizar(index, 'stock', e.target.value)}
                                                placeholder="Ilimitado"
                                                className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#6000ca] focus:ring focus:ring-[#6000ca] focus:ring-opacity-50 transition-all"
                                            />
                                            {errorStock && <p className="mt-1 text-xs text-red-600">{errorStock}</p>}
                                        </div>

                                        <div className="flex flex-col items-center">
                                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
                                                Activo
                                            </label>
                                            <input
                                                type="checkbox"
                                                checked={variante.is_active ?? true}
                                                onChange={(e) => actualizar(index, 'is_active', e.target.checked)}
                                                className="mt-2 h-5 w-5 rounded border-gray-300 text-[#6000ca] focus:ring-[#6000ca]"
                                            />
                                        </div>

                                        <div className="flex sm:flex-col items-center gap-1 sm:pt-5">
                                            <button
                                                type="button"
                                                onClick={() => subir(index)}
                                                disabled={posicionActual === 0}
                                                className="p-1 text-gray-400 hover:text-[#6000ca] disabled:opacity-30 disabled:cursor-not-allowed"
                                                aria-label="Subir variante"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => bajar(index)}
                                                disabled={posicionActual === variantesVisibles.length - 1}
                                                className="p-1 text-gray-400 hover:text-[#6000ca] disabled:opacity-30 disabled:cursor-not-allowed"
                                                aria-label="Bajar variante"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => quitar(index)}
                                                className="admin-delete p-1 text-red-500 hover:bg-red-50 rounded-lg transition-all hover:scale-110"
                                                aria-label="Quitar variante"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                        <label className="flex items-center gap-2 cursor-pointer w-fit">
                                            <input
                                                type="checkbox"
                                                checked={!!variante.es_color_personalizado}
                                                onChange={(e) => actualizar(index, 'es_color_personalizado', e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300 text-[#6000ca] focus:ring-[#6000ca]"
                                            />
                                            <span className="text-sm font-semibold text-gray-700">
                                                Es un color a elección del cliente
                                            </span>
                                        </label>
                                        {errorPersonalizado && <p className="mt-1 text-xs text-red-600">{errorPersonalizado}</p>}

                                        {variante.es_color_personalizado && (
                                            <div className="mt-2 rounded-lg bg-purple-50 border border-purple-200 p-3 text-xs text-purple-800 space-y-1">
                                                <p>El color de arriba es solo un ícono de referencia — no es el color real que va a pedir el cliente.</p>
                                                <p>El precio adicional de esta fila es el costo de pedir un color a medida.</p>
                                            </div>
                                        )}

                                        {sinImagenPropia && (
                                            <div className="mt-2 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800">
                                                Este color no tiene imagen propia — se va a mostrar la general si existe, o sin foto específica si no hay ninguna.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            )}

            <button
                type="button"
                onClick={agregar}
                className="inline-flex items-center px-4 py-2 bg-white border-2 border-dashed border-[#6000ca]/50 rounded-xl font-semibold text-sm text-[#6000ca] hover:bg-[#6000ca]/5 transition-all"
            >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar variante
            </button>
        </div>
    );
}
