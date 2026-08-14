import { useMemo } from 'react';
import TablaPreciosPreview from '@/Components/TablaPreciosPreview';

function parseNumero(valor) {
    if (valor === '' || valor === null || valor === undefined) return null;
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
}

/**
 * Replica en cliente las reglas del backend (ProductoController::escalasPrecioReglas):
 * cantidad_minima entera > 1, precio_unitario numérico > 0, sin cantidad_minima duplicada.
 * Devuelve { esValido, errores } donde errores es un array paralelo a `escalas`.
 */
export function validarEscalasPrecio(escalas) {
    const conteoPorCantidad = new Map();
    escalas.forEach((escala) => {
        const cantidad = parseNumero(escala.cantidad_minima);
        if (cantidad !== null && Number.isInteger(cantidad)) {
            conteoPorCantidad.set(cantidad, (conteoPorCantidad.get(cantidad) || 0) + 1);
        }
    });

    let esValido = true;

    const errores = escalas.map((escala) => {
        const fila = {};
        const cantidad = parseNumero(escala.cantidad_minima);
        const precio = parseNumero(escala.precio_unitario);

        if (cantidad === null) {
            fila.cantidad_minima = 'La cantidad mínima es obligatoria.';
        } else if (!Number.isInteger(cantidad) || cantidad <= 1) {
            fila.cantidad_minima = 'Debe ser un número entero mayor a 1.';
        } else if (conteoPorCantidad.get(cantidad) > 1) {
            fila.cantidad_minima = 'Hay otra escala con la misma cantidad mínima.';
        }

        if (precio === null) {
            fila.precio_unitario = 'El precio unitario es obligatorio.';
        } else if (precio <= 0) {
            fila.precio_unitario = 'Debe ser mayor a 0.';
        }

        if (fila.cantidad_minima || fila.precio_unitario) {
            esValido = false;
        }

        return fila;
    });

    return { esValido, errores };
}

/**
 * Repeater de "Precios por Cantidad" para Admin/Productos/Create y Edit.
 * `escalas` es controlado por el padre (data.escalas_precio de useForm); este
 * componente solo notifica cambios vía onChange, sin mantener estado propio.
 */
export default function EscalasPrecioRepeater({ escalas, onChange, precioBase, errors = {} }) {
    const { errores: erroresCliente } = useMemo(() => validarEscalasPrecio(escalas), [escalas]);

    const actualizar = (index, campo, valor) => {
        onChange(escalas.map((escala, i) => (i === index ? { ...escala, [campo]: valor } : escala)));
    };

    const agregar = () => {
        onChange([...escalas, { cantidad_minima: '', precio_unitario: '' }]);
    };

    const quitar = (index) => {
        onChange(escalas.filter((_, i) => i !== index));
    };

    const precioBaseNum = parseNumero(precioBase);

    const filasPreview = useMemo(() => {
        const filas = escalas
            .map((escala) => {
                const precio = parseNumero(escala.precio_unitario);
                return {
                    cantidad: parseNumero(escala.cantidad_minima),
                    precioOriginal: precio,
                    precioFinal: precio,
                    esBase: false,
                };
            })
            .filter((fila) => fila.cantidad !== null && fila.precioOriginal !== null && fila.cantidad > 1);

        if (precioBaseNum !== null) {
            filas.push({ cantidad: 1, precioOriginal: precioBaseNum, precioFinal: precioBaseNum, esBase: true });
        }

        return filas.sort((a, b) => a.cantidad - b.cantidad);
    }, [escalas, precioBaseNum]);

    const advertenciaFila = (index) => {
        const precioActual = parseNumero(escalas[index]?.precio_unitario);
        if (precioActual === null) return null;

        const precioReferencia = index === 0
            ? precioBaseNum
            : parseNumero(escalas[index - 1]?.precio_unitario);

        if (precioReferencia === null) return null;

        return precioActual >= precioReferencia
            ? 'El precio no baja respecto al nivel anterior: revisá si es intencional.'
            : null;
    };

    return (
        <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
                <svg className="h-5 w-5 mr-2 text-[#40B0C2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3v-3m-3 3v-3m9-9H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2z" />
                </svg>
                Precios por Cantidad
            </h3>
            <p className="text-sm text-gray-500 mb-4">
                Opcional. Definí precios especiales a partir de una cantidad mínima de unidades. Si no cargás ninguna escala, siempre se usa el precio base.
            </p>

            {escalas.length > 0 && (
                <div className="space-y-3 mb-4">
                    {escalas.map((escala, index) => {
                        const errorCliente = erroresCliente[index] || {};
                        const errorCantidad = errors[`escalas_precio.${index}.cantidad_minima`] || errorCliente.cantidad_minima;
                        const errorPrecio = errors[`escalas_precio.${index}.precio_unitario`] || errorCliente.precio_unitario;
                        const advertencia = !errorPrecio ? advertenciaFila(index) : null;

                        return (
                            <div key={index} className="p-4 bg-white border-2 border-gray-200 rounded-xl">
                                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-start">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
                                            Cantidad mínima
                                        </label>
                                        <input
                                            type="number"
                                            min="2"
                                            step="1"
                                            value={escala.cantidad_minima}
                                            onChange={(e) => actualizar(index, 'cantidad_minima', e.target.value)}
                                            className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50 transition-all"
                                        />
                                        {errorCantidad && (
                                            <p className="mt-1 text-xs text-red-600">{errorCantidad}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
                                            Precio unitario
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                value={escala.precio_unitario}
                                                onChange={(e) => actualizar(index, 'precio_unitario', e.target.value)}
                                                className="block w-full pl-8 rounded-xl border-gray-300 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50 transition-all"
                                            />
                                        </div>
                                        {errorPrecio && (
                                            <p className="mt-1 text-xs text-red-600">{errorPrecio}</p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => quitar(index)}
                                        className="mt-6 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all hover:scale-110"
                                        aria-label="Quitar escala"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                                {advertencia && (
                                    <div className="mt-2 flex items-center text-xs text-amber-600">
                                        <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l6.518 11.598c.75 1.334-.213 2.986-1.743 2.986H3.482c-1.53 0-2.493-1.652-1.743-2.986L8.257 3.1zM11 14a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        {advertencia}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <button
                type="button"
                onClick={agregar}
                className="inline-flex items-center px-4 py-2 bg-white border-2 border-dashed border-[#40B0C2]/50 rounded-xl font-semibold text-sm text-[#40B0C2] hover:bg-[#40B0C2]/5 transition-all"
            >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar escala
            </button>

            <TablaPreciosPreview filas={filasPreview} />
        </div>
    );
}
