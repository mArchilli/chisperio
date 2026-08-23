import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        codigo: '',
        tipo_descuento: 'porcentaje',
        valor_descuento: '',
        vigente_desde: '',
        vigente_hasta: '',
        limite_usos: '',
        activo: true,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('codigos-descuento.store'));
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                        Nuevo Código de Descuento
                    </h2>
                    <Link
                        href={route('codigos-descuento.index')}
                        className="inline-flex items-center px-4 py-2 bg-white border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-300 transform hover:scale-105"
                    >
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver
                    </Link>
                </div>
            }
        >
            <Head title="Nuevo Código de Descuento" />

            <div className="py-8">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
                            {/* Código */}
                            <div className="mb-6">
                                <label htmlFor="codigo" className="block text-sm font-bold text-gray-900 mb-2">
                                    Código *
                                </label>
                                <input
                                    type="text"
                                    id="codigo"
                                    value={data.codigo}
                                    onChange={e => setData('codigo', e.target.value.toUpperCase())}
                                    placeholder="Ej: VERANO10"
                                    className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#A72DAB] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02] uppercase"
                                />
                                {errors.codigo && (
                                    <p className="mt-2 text-sm text-red-600">{errors.codigo}</p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">
                                    Se guarda en mayúsculas y sin espacios. Es lo que el cliente va a ingresar en el carrito.
                                </p>
                            </div>

                            {/* Tipo y Valor de Descuento */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label htmlFor="tipo_descuento" className="block text-sm font-bold text-gray-900 mb-2">
                                        Tipo de Descuento *
                                    </label>
                                    <select
                                        id="tipo_descuento"
                                        value={data.tipo_descuento}
                                        onChange={e => setData('tipo_descuento', e.target.value)}
                                        className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#A72DAB] focus:border-transparent transition-all duration-300 hover:border-gray-300"
                                    >
                                        <option value="porcentaje">Porcentaje</option>
                                        <option value="fijo">Monto fijo</option>
                                    </select>
                                    {errors.tipo_descuento && (
                                        <p className="mt-2 text-sm text-red-600">{errors.tipo_descuento}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="valor_descuento" className="block text-sm font-bold text-gray-900 mb-2">
                                        Valor {data.tipo_descuento === 'porcentaje' ? '(%)' : '($)'} *
                                    </label>
                                    <input
                                        type="number"
                                        id="valor_descuento"
                                        step="0.01"
                                        min="0"
                                        max={data.tipo_descuento === 'porcentaje' ? 100 : undefined}
                                        value={data.valor_descuento}
                                        onChange={e => setData('valor_descuento', e.target.value)}
                                        className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#A72DAB] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02]"
                                    />
                                    {errors.valor_descuento && (
                                        <p className="mt-2 text-sm text-red-600">{errors.valor_descuento}</p>
                                    )}
                                </div>
                            </div>

                            {/* Vigencia */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label htmlFor="vigente_desde" className="block text-sm font-bold text-gray-900 mb-2">
                                        Vigente Desde <span className="text-gray-500 font-normal">(Opcional)</span>
                                    </label>
                                    <input
                                        type="date"
                                        id="vigente_desde"
                                        value={data.vigente_desde}
                                        onChange={e => setData('vigente_desde', e.target.value)}
                                        className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#A72DAB] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02]"
                                    />
                                    {errors.vigente_desde && (
                                        <p className="mt-2 text-sm text-red-600">{errors.vigente_desde}</p>
                                    )}
                                    <p className="mt-1 text-xs text-gray-500">
                                        Si no se especifica, el código está vigente desde ya
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="vigente_hasta" className="block text-sm font-bold text-gray-900 mb-2">
                                        Vigente Hasta <span className="text-gray-500 font-normal">(Opcional)</span>
                                    </label>
                                    <input
                                        type="date"
                                        id="vigente_hasta"
                                        value={data.vigente_hasta}
                                        onChange={e => setData('vigente_hasta', e.target.value)}
                                        min={data.vigente_desde}
                                        className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#A72DAB] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02]"
                                    />
                                    {errors.vigente_hasta && (
                                        <p className="mt-2 text-sm text-red-600">{errors.vigente_hasta}</p>
                                    )}
                                    <p className="mt-1 text-xs text-gray-500">
                                        Si no se especifica, el código no tiene fecha de vencimiento
                                    </p>
                                </div>
                            </div>

                            {/* Límite de usos */}
                            <div className="mb-6">
                                <label htmlFor="limite_usos" className="block text-sm font-bold text-gray-900 mb-2">
                                    Límite de Usos <span className="text-gray-500 font-normal">(Opcional)</span>
                                </label>
                                <input
                                    type="number"
                                    id="limite_usos"
                                    min="1"
                                    step="1"
                                    value={data.limite_usos}
                                    onChange={e => setData('limite_usos', e.target.value)}
                                    placeholder="Sin límite"
                                    className="block w-full max-w-xs px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#A72DAB] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02]"
                                />
                                {errors.limite_usos && (
                                    <p className="mt-2 text-sm text-red-600">{errors.limite_usos}</p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">
                                    Si no se especifica, el código se puede usar sin límite de veces
                                </p>
                            </div>

                            {/* Estado Activo */}
                            <div className="mb-8">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.activo}
                                        onChange={e => setData('activo', e.target.checked)}
                                        className="w-5 h-5 text-[#A72DAB] border-2 border-gray-300 rounded focus:ring-2 focus:ring-[#A72DAB] transition-all"
                                    />
                                    <span className="ml-3 text-sm font-semibold text-gray-900">
                                        Código activo
                                    </span>
                                </label>
                                <p className="ml-8 mt-1 text-xs text-gray-500">
                                    Si está desactivado, el código no se puede usar aunque esté en el rango de fechas
                                </p>
                            </div>

                            {/* Botones */}
                            <div className="flex flex-col sm:flex-row gap-3 justify-end pt-6 border-t border-gray-200">
                                <Link
                                    href={route('codigos-descuento.index')}
                                    className="inline-flex items-center justify-center px-6 py-3 bg-white border-2 border-gray-300 rounded-xl font-semibold text-sm text-gray-700 hover:bg-gray-50 transition-all duration-300 transform hover:scale-105"
                                >
                                    Cancelar
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] border border-transparent rounded-xl font-semibold text-sm text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Crear Código
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
