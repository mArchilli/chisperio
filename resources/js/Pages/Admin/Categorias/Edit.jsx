import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Edit({ categoria }) {
    const { data, setData, put, processing, errors } = useForm({
        nombre: categoria.nombre || '',
        descripcion: categoria.descripcion || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('categorias.update', categoria.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-2xl font-bold text-[#6000ca]">
                        Editar Categoría
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">Modifica los datos de la categoría</p>
                </div>
            }
        >
            <Head title="Editar Categoría" />

            <div className="py-8">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <div className="admin-card overflow-hidden bg-white shadow-xl sm:rounded-2xl">
                        <div className="p-8">
                            <form onSubmit={handleSubmit}>
                                <div className="mb-6">
                                    <label htmlFor="nombre" className="block text-sm font-bold text-gray-700 mb-2">
                                        Nombre <span className="text-[#6000ca]">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="nombre"
                                        value={data.nombre}
                                        onChange={(e) => setData('nombre', e.target.value)}
                                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#6000ca] focus:ring focus:ring-[#6000ca] focus:ring-opacity-50 transition-all"
                                        placeholder="Ingresa el nombre de la categoría"
                                        required
                                    />
                                    {errors.nombre && (
                                        <p className="mt-2 text-sm text-red-600 flex items-center">
                                            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            {errors.nombre}
                                        </p>
                                    )}
                                </div>

                                <div className="mb-6">
                                    <label htmlFor="descripcion" className="block text-sm font-bold text-gray-700 mb-2">
                                        Descripción
                                    </label>
                                    <textarea
                                        id="descripcion"
                                        value={data.descripcion}
                                        onChange={(e) => setData('descripcion', e.target.value)}
                                        rows="4"
                                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#6000ca] focus:ring focus:ring-[#6000ca] focus:ring-opacity-50 transition-all"
                                        placeholder="Descripción opcional de la categoría"
                                    />
                                    {errors.descripcion && (
                                        <p className="mt-2 text-sm text-red-600 flex items-center">
                                            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            {errors.descripcion}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                    <Link
                                        href={route('categorias.index')}
                                        className="inline-flex items-center px-6 py-3 bg-white border-2 border-gray-300 rounded-xl font-semibold text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
                                    >
                                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Cancelar
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex items-center px-6 py-3 bg-[#6000ca] border border-transparent rounded-xl font-semibold text-sm text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 focus:outline-none focus:ring-2 focus:ring-[#6000ca] focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                                    >
                                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Actualizar
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
