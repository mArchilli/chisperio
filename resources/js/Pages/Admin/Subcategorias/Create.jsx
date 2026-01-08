import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Create({ categorias, categoriaId }) {
    const { data, setData, post, processing, errors } = useForm({
        nombre: '',
        descripcion: '',
        categoria_id: categoriaId || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('subcategorias.store'));
    };

    const selectedCategoria = categorias.find(c => c.id == data.categoria_id);

    return (
        <AuthenticatedLayout
            header={
                <div>
                    {/* Breadcrumb */}
                    <div className="flex items-center text-sm mb-3">
                        <Link href={route('categorias.index')} className="text-gray-500 hover:text-[#40B0C2] transition-colors">
                            Categorías
                        </Link>
                        {selectedCategoria && (
                            <>
                                <svg className="h-4 w-4 mx-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                                <Link 
                                    href={route('subcategorias.index', { categoria_id: selectedCategoria.id })} 
                                    className="text-gray-500 hover:text-[#40B0C2] transition-colors"
                                >
                                    {selectedCategoria.nombre}
                                </Link>
                            </>
                        )}
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                            Crear Nueva Subcategoría
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">Completa los datos para crear una nueva subcategoría</p>
                    </div>
                </div>
            }
        >
            <Head title="Crear Subcategoría" />

            <div className="py-8">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-xl sm:rounded-2xl">
                        <div className="p-8">
                            <form onSubmit={handleSubmit}>
                                <div className="mb-6">
                                    <label htmlFor="categoria_id" className="block text-sm font-bold text-gray-700 mb-2">
                                        Categoría <span className="text-[#A72DAB]">*</span>
                                    </label>
                                    <select
                                        id="categoria_id"
                                        value={data.categoria_id}
                                        onChange={(e) => setData('categoria_id', e.target.value)}
                                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50 transition-all"
                                        required
                                    >
                                        <option value="">Seleccione una categoría</option>
                                        {categorias.map((categoria) => (
                                            <option key={categoria.id} value={categoria.id}>
                                                {categoria.nombre}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.categoria_id && (
                                        <p className="mt-1 text-sm text-red-600">{errors.categoria_id}</p>
                                    )}
                                </div>

                                <div className="mb-6">
                                    <label htmlFor="nombre" className="block text-sm font-bold text-gray-700 mb-2">
                                        Nombre <span className="text-[#A72DAB]">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="nombre"
                                        value={data.nombre}
                                        onChange={(e) => setData('nombre', e.target.value)}
                                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50 transition-all"
                                        required
                                    />
                                    {errors.nombre && (
                                        <div className="mt-2 flex items-center text-sm text-red-600">
                                            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            {errors.nombre}
                                        </div>
                                    )}
                                </div>

                                <div className="mb-8">
                                    <label htmlFor="descripcion" className="block text-sm font-bold text-gray-700 mb-2">
                                        Descripción
                                    </label>
                                    <textarea
                                        id="descripcion"
                                        value={data.descripcion}
                                        onChange={(e) => setData('descripcion', e.target.value)}
                                        rows="4"
                                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50 transition-all resize-none"
                                    />
                                    {errors.descripcion && (
                                        <div className="mt-2 flex items-center text-sm text-red-600">
                                            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            {errors.descripcion}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100">
                                    <Link
                                        href={route('subcategorias.index', data.categoria_id ? { categoria_id: data.categoria_id } : {})}
                                        className="inline-flex items-center px-6 py-3 bg-white border-2 border-gray-300 rounded-xl font-semibold text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all shadow-sm"
                                    >
                                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Cancelar
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] border border-transparent rounded-xl font-semibold text-sm text-white hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                                    >
                                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {processing ? 'Guardando...' : 'Guardar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
