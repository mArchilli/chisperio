import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ subcategorias, categoria, categoriaId }) {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [subcategoriaToDelete, setSubcategoriaToDelete] = useState(null);

    const openDeleteModal = (subcategoria) => {
        setSubcategoriaToDelete(subcategoria);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setSubcategoriaToDelete(null);
    };

    const handleDelete = () => {
        if (subcategoriaToDelete) {
            router.delete(route('subcategorias.destroy', subcategoriaToDelete.id), {
                onSuccess: () => closeDeleteModal(),
            });
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    {/* Breadcrumb */}
                    <div className="flex items-center text-sm mb-3">
                        <Link href={route('categorias.index')} className="text-gray-500 hover:text-[#40B0C2] transition-colors">
                            Categorías
                        </Link>
                        {categoria && (
                            <>
                                <svg className="h-4 w-4 mx-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                                <span className="text-[#A72DAB] font-semibold">{categoria.nombre}</span>
                            </>
                        )}
                    </div>
                    
                    <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
                        <div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                                {categoria ? `Subcategorías de ${categoria.nombre}` : 'Todas las Subcategorías'}
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">Gestiona las subcategorías</p>
                        </div>
                        <Link
                            href={route('subcategorias.create', categoriaId ? { categoria_id: categoriaId } : {})}
                            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] border border-transparent rounded-xl font-semibold text-sm text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 focus:outline-none focus:ring-2 focus:ring-[#A72DAB] focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
                        >
                            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Nueva Subcategoría
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title={categoria ? `Subcategorías - ${categoria.nombre}` : 'Subcategorías'} />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {/* Vista de Cards para móvil */}
                    <div className="lg:hidden space-y-4 px-4">
                        {subcategorias.length === 0 ? (
                            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#40B0C2]/20 to-[#A72DAB]/20 mb-4">
                                    <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                    </svg>
                                </div>
                                <p className="text-gray-500">No hay subcategorías registradas</p>
                            </div>
                        ) : (
                            subcategorias.map((subcategoria) => (
                                <div key={subcategoria.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-200">
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center flex-1">
                                                <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-gradient-to-br from-[#40B0C2]/20 to-[#A72DAB]/20 flex items-center justify-center border-2 border-[#A72DAB]/30">
                                                    <span className="text-[#A72DAB] font-bold text-lg">{subcategoria.nombre.charAt(0)}</span>
                                                </div>
                                                <div className="ml-4 flex-1">
                                                    <h3 className="text-lg font-bold text-gray-900">{subcategoria.nombre}</h3>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="mb-4">
                                            <p className="text-sm text-gray-600 line-clamp-2">
                                                {subcategoria.descripcion || <span className="text-gray-400 italic">Sin descripción</span>}
                                            </p>
                                        </div>

                                        {!categoria && subcategoria.categoria && (
                                            <div className="mb-4 pb-4 border-b border-gray-100">
                                                <span className="text-sm text-gray-500 font-medium">Categoría: </span>
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-[#40B0C2]/20 to-[#A72DAB]/20 text-[#A72DAB] border border-[#A72DAB]/30">
                                                    {subcategoria.categoria.nombre}
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <Link
                                                href={route('subcategorias.edit', subcategoria.id)}
                                                className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-white border-2 border-[#40B0C2] text-[#40B0C2] rounded-lg text-sm font-medium"
                                            >
                                                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                Editar
                                            </Link>
                                            <button
                                                onClick={() => openDeleteModal(subcategoria)}
                                                className="inline-flex items-center justify-center px-4 py-2 bg-white border-2 border-red-500 text-red-500 rounded-lg text-sm font-medium"
                                            >
                                                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Vista de Tabla para desktop */}
                    <div className="hidden lg:block overflow-hidden bg-white shadow-xl sm:rounded-2xl">
                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b-2 border-gradient-to-r from-[#40B0C2] to-[#A72DAB]">
                                            <th className="px-6 py-4 text-left text-sm font-semibold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                                                Subcategoría
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                                                Descripción
                                            </th>
                                            {!categoria && (
                                                <th className="px-6 py-4 text-left text-sm font-semibold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                                                    Categoría
                                                </th>
                                            )}
                                            <th className="px-6 py-4 text-right text-sm font-semibold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {subcategorias.length === 0 ? (
                                            <tr>
                                                <td colSpan={categoria ? "4" : "5"} className="px-6 py-4 text-center text-gray-500">
                                                    No hay subcategorías registradas
                                                </td>
                                            </tr>
                                        ) : (
                                            subcategorias.map((subcategoria) => (
                                                <tr key={subcategoria.id} className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-[#40B0C2]/5 hover:to-[#A72DAB]/5 transition-all duration-200">
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center">
                                                            <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-[#40B0C2]/20 to-[#A72DAB]/20 flex items-center justify-center border-2 border-[#A72DAB]/30">
                                                                <span className="text-[#A72DAB] font-bold text-sm">{subcategoria.nombre.charAt(0)}</span>
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-bold text-gray-900">{subcategoria.nombre}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-sm text-gray-600">
                                                        {subcategoria.descripcion || <span className="text-gray-400 italic">Sin descripción</span>}
                                                    </td>
                                                    {!categoria && (
                                                        <td className="px-6 py-5">
                                                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-[#40B0C2]/20 to-[#A72DAB]/20 text-[#A72DAB] border border-[#A72DAB]/30">
                                                                {subcategoria.categoria?.nombre || '-'}
                                                            </span>
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex justify-end gap-2">
                                                            <Link
                                                                href={route('subcategorias.edit', subcategoria.id)}
                                                                className="inline-flex items-center px-3 py-1.5 bg-white border-2 border-[#40B0C2] text-[#40B0C2] rounded-lg hover:bg-[#40B0C2] hover:text-white transition-all text-xs font-medium"
                                                            >
                                                                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                                Editar
                                                            </Link>
                                                            <button
                                                                onClick={() => openDeleteModal(subcategoria)}
                                                                className="inline-flex items-center px-3 py-1.5 bg-white border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs font-medium"
                                                            >
                                                                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                                Eliminar
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de confirmación de eliminación */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeDeleteModal}></div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                        </svg>
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            Eliminar Subcategoría
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                ¿Estás seguro de que deseas eliminar la subcategoría "<strong>{subcategoriaToDelete?.nombre}</strong>"? 
                                                Esta acción no se puede deshacer.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Eliminar
                                </button>
                                <button
                                    type="button"
                                    onClick={closeDeleteModal}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
