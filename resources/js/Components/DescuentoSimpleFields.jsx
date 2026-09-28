/**
 * Valida en cliente el bloque de descuento simple de un combo (espejo de
 * ComboController::descuentoReglas): si `descuento_activo` es true, tipo y valor son
 * obligatorios y el valor tiene que ser > 0 (y <= 100 si es porcentaje).
 */
export function validarDescuentoSimple(data) {
    if (!data.descuento_activo) return { esValido: true, errores: {} };

    const errores = {};
    const valor = Number(data.valor_descuento);

    if (!data.tipo_descuento) {
        errores.tipo_descuento = 'Elegí un tipo de descuento.';
    }

    if (data.valor_descuento === '' || data.valor_descuento === null || !Number.isFinite(valor) || valor <= 0) {
        errores.valor_descuento = 'El valor del descuento debe ser mayor a 0.';
    } else if (data.tipo_descuento === 'porcentaje' && valor > 100) {
        errores.valor_descuento = 'Un descuento porcentual no puede superar el 100%.';
    }

    if (data.descuento_fecha_inicio && data.descuento_fecha_fin && data.descuento_fecha_fin < data.descuento_fecha_inicio) {
        errores.descuento_fecha_fin = 'La fecha de fin no puede ser anterior a la de inicio.';
    }

    return { esValido: Object.keys(errores).length === 0, errores };
}

/**
 * Descuento propio de un combo: a diferencia de Ofertas (múltiples ofertas
 * programadas, con alcance/escala), un combo tiene un único descuento configurable
 * directo acá — tipo/valor/vigencia opcional/activo. Usado en Admin/Combos/Create y Edit.
 */
export default function DescuentoSimpleFields({ data, setData, errors = {} }) {
    const erroresCliente = validarDescuentoSimple(data).errores;

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-xl mb-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Descuento del combo</h3>
                    <p className="text-xs text-gray-500 mt-1">Opcional — un solo descuento propio, independiente del precio de los productos.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={data.descuento_activo}
                        onChange={(e) => setData('descuento_activo', e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#40B0C2]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-green-400 peer-checked:to-green-600"></div>
                </label>
            </div>

            {data.descuento_activo && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Tipo</label>
                        <div className="flex rounded-xl border border-gray-300 overflow-hidden">
                            {[
                                { value: 'porcentaje', label: '% Porcentaje' },
                                { value: 'fijo', label: '$ Fijo' },
                            ].map((opcion) => (
                                <button
                                    key={opcion.value}
                                    type="button"
                                    onClick={() => setData('tipo_descuento', opcion.value)}
                                    className={`flex-1 px-3 py-2 text-sm font-semibold transition-all ${
                                        data.tipo_descuento === opcion.value
                                            ? 'bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] text-white'
                                            : 'bg-white text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    {opcion.label}
                                </button>
                            ))}
                        </div>
                        {(errors.tipo_descuento || erroresCliente.tipo_descuento) && (
                            <p className="mt-1 text-xs text-red-600">{errors.tipo_descuento || erroresCliente.tipo_descuento}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Valor</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                                {data.tipo_descuento === 'fijo' ? '$' : '%'}
                            </span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={data.valor_descuento}
                                onChange={(e) => setData('valor_descuento', e.target.value)}
                                className="block w-full pl-8 rounded-xl border-gray-300 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50 transition-all"
                            />
                        </div>
                        {(errors.valor_descuento || erroresCliente.valor_descuento) && (
                            <p className="mt-1 text-xs text-red-600">{errors.valor_descuento || erroresCliente.valor_descuento}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Desde (opcional)</label>
                        <input
                            type="datetime-local"
                            value={data.descuento_fecha_inicio || ''}
                            onChange={(e) => setData('descuento_fecha_inicio', e.target.value)}
                            className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Hasta (opcional)</label>
                        <input
                            type="datetime-local"
                            value={data.descuento_fecha_fin || ''}
                            onChange={(e) => setData('descuento_fecha_fin', e.target.value)}
                            className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50 transition-all"
                        />
                        {(errors.descuento_fecha_fin || erroresCliente.descuento_fecha_fin) && (
                            <p className="mt-1 text-xs text-red-600">{errors.descuento_fecha_fin || erroresCliente.descuento_fecha_fin}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
