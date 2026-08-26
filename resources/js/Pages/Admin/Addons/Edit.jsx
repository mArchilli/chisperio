import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Edit({ addon }) {
    const { data, setData, put, processing, errors } = useForm({
        nombre: addon.nombre || '',
        descripcion: addon.descripcion || '',
        precio: addon.precio ?? '',
        requiere_texto: addon.requiere_texto ?? false,
        placeholder_texto: addon.placeholder_texto || '',
        max_caracteres: addon.max_caracteres ?? '',
        is_active: addon.is_active ?? true,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('addons.update', addon.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                        Editar Add-on
                    </h2>
                    <Link
                        href={route('addons.index')}
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
            <Head title="Editar Add-on" />

            <div className="py-8">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    {addon.usado && (
                        <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                            Este add-on ya fue usado en pedidos. No se puede eliminar, pero podés editarlo o desactivarlo.
                        </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
                            {/* Nombre */}
                            <div className="mb-6">
                                <label htmlFor="nombre" className="block text-sm font-bold text-gray-900 mb-2">
                                    Nombre *
                                </label>
                                <input
                                    type="text"
                                    id="nombre"
                                    value={data.nombre}
                                    onChange={e => setData('nombre', e.target.value)}
                                    className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#A72DAB] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02]"
                                />
                                {errors.nombre && (
                                    <p className="mt-2 text-sm text-red-600">{errors.nombre}</p>
                                )}
                            </div>

                            {/* Descripción */}
                            <div className="mb-6">
                                <label htmlFor="descripcion" className="block text-sm font-bold text-gray-900 mb-2">
                                    Descripción <span className="text-gray-500 font-normal">(Opcional)</span>
                                </label>
                                <textarea
                                    id="descripcion"
                                    rows={3}
                                    value={data.descripcion}
                                    onChange={e => setData('descripcion', e.target.value)}
                                    className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#A72DAB] focus:border-transparent transition-all duration-300 hover:border-gray-300"
                                />
                                {errors.descripcion && (
                                    <p className="mt-2 text-sm text-red-600">{errors.descripcion}</p>
                                )}
                            </div>

                            {/* Precio */}
                            <div className="mb-6">
                                <label htmlFor="precio" className="block text-sm font-bold text-gray-900 mb-2">
                                    Precio ($) *
                                </label>
                                <input
                                    type="number"
                                    id="precio"
                                    step="0.01"
                                    min="0"
                                    value={data.precio}
                                    onChange={e => setData('precio', e.target.value)}
                                    className="block w-full max-w-xs px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#A72DAB] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02]"
                                />
                                {errors.precio && (
                                    <p className="mt-2 text-sm text-red-600">{errors.precio}</p>
                                )}
                            </div>

                            {/* Requiere texto */}
                            <div className="mb-6">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.requiere_texto}
                                        onChange={e => setData('requiere_texto', e.target.checked)}
                                        className="w-5 h-5 text-[#A72DAB] border-2 border-gray-300 rounded focus:ring-2 focus:ring-[#A72DAB] transition-all"
                                    />
                                    <span className="ml-3 text-sm font-semibold text-gray-900">
                                        Requiere que el cliente escriba un texto
                                    </span>
                                </label>
                                <p className="ml-8 mt-1 text-xs text-gray-500">
                                    Por ejemplo, el nombre a grabar. Se le va a pedir en la ficha del producto.
                                </p>
                            </div>

                            {data.requiere_texto && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pl-8">
                                    <div>
                                        <label htmlFor="placeholder_texto" className="block text-sm font-bold text-gray-900 mb-2">
                                            Placeholder del texto *
                                        </label>
                                        <input
                                            type="text"
                                            id="placeholder_texto"
                                            value={data.placeholder_texto}
                                            onChange={e => setData('placeholder_texto', e.target.value)}
                                            placeholder="Ej: Escribí el nombre a grabar"
                                            className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#A72DAB] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02]"
                                        />
                                        {errors.placeholder_texto && (
                                            <p className="mt-2 text-sm text-red-600">{errors.placeholder_texto}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="max_caracteres" className="block text-sm font-bold text-gray-900 mb-2">
                                            Máximo de caracteres <span className="text-gray-500 font-normal">(Opcional)</span>
                                        </label>
                                        <input
                                            type="number"
                                            id="max_caracteres"
                                            min="1"
                                            step="1"
                                            value={data.max_caracteres}
                                            onChange={e => setData('max_caracteres', e.target.value)}
                                            className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#A72DAB] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02]"
                                        />
                                        {errors.max_caracteres && (
                                            <p className="mt-2 text-sm text-red-600">{errors.max_caracteres}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Estado Activo */}
                            <div className="mb-8">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={e => setData('is_active', e.target.checked)}
                                        className="w-5 h-5 text-[#A72DAB] border-2 border-gray-300 rounded focus:ring-2 focus:ring-[#A72DAB] transition-all"
                                    />
                                    <span className="ml-3 text-sm font-semibold text-gray-900">
                                        Add-on activo
                                    </span>
                                </label>
                                <p className="ml-8 mt-1 text-xs text-gray-500">
                                    Si está desactivado, no va a estar disponible para agregar a productos
                                </p>
                            </div>

                            {/* Botones */}
                            <div className="flex flex-col sm:flex-row gap-3 justify-end pt-6 border-t border-gray-200">
                                <Link
                                    href={route('addons.index')}
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
                                            Guardar Cambios
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
