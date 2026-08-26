import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { FileText, Link2, ExternalLink, Pencil, Trash2 } from 'lucide-react';

export default function Index({ documentos }) {
    const { auth, flash } = usePage().props;
    const esAdmin = auth.user.role === 'admin';
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [documentoToDelete, setDocumentoToDelete] = useState(null);

    const openDeleteModal = (documento) => {
        setDocumentoToDelete(documento);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setDocumentoToDelete(null);
    };

    const handleDelete = () => {
        if (documentoToDelete) {
            router.delete(route('documentos.destroy', documentoToDelete.id), {
                onSuccess: () => closeDeleteModal(),
            });
        }
    };

    const toggleActive = (documento) => {
        router.patch(route('documentos.toggle-active', documento.id), {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const hrefDocumento = (documento) =>
        documento.tipo === 'link' ? documento.url : `/${documento.ruta}`;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                            Documentación
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Material de referencia y recursos para el equipo de ventas
                        </p>
                    </div>
                    {esAdmin && (
                        <Link
                            href={route('documentos.create')}
                            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] border border-transparent rounded-xl font-semibold text-sm text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 focus:outline-none focus:ring-2 focus:ring-[#A72DAB] focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
                        >
                            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Nuevo documento
                        </Link>
                    )}
                </div>
            }
        >
            <Head title="Documentación" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="mb-6 mx-4 sm:mx-0 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-6 mx-4 sm:mx-0 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                            {flash.error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-0">
                        {documentos.length === 0 ? (
                            <div className="col-span-full bg-white rounded-2xl shadow-lg p-12 text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#40B0C2]/20 to-[#A72DAB]/20 mb-4">
                                    <FileText className="h-10 w-10 text-gray-400" />
                                </div>
                                <p className="text-gray-600 text-lg mb-2">
                                    {esAdmin ? 'Todavía no cargaste ningún documento' : 'Todavía no hay documentación disponible'}
                                </p>
                                {esAdmin && (
                                    <Link
                                        href={route('documentos.create')}
                                        className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
                                    >
                                        Cargar el primer documento
                                    </Link>
                                )}
                            </div>
                        ) : (
                            documentos.map((documento) => (
                                <div
                                    key={documento.id}
                                    className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
                                >
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-gradient-to-br from-[#40B0C2] to-[#A72DAB] flex items-center justify-center">
                                                {documento.tipo === 'pdf' ? (
                                                    <FileText className="h-6 w-6 text-white" />
                                                ) : (
                                                    <Link2 className="h-6 w-6 text-white" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-base font-bold text-gray-900 leading-tight line-clamp-2">
                                                    {documento.titulo}
                                                </h3>
                                                {esAdmin && (
                                                    <span
                                                        className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                                            documento.is_active
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-red-100 text-red-600'
                                                        }`}
                                                    >
                                                        {documento.is_active ? 'Visible' : 'Oculto'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {documento.descripcion ? (
                                            <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-1">
                                                {documento.descripcion}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-gray-400 italic mb-4 flex-1">Sin descripción</p>
                                        )}

                                        <a
                                            href={hrefDocumento(documento)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-95"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            {documento.tipo === 'pdf' ? 'Ver PDF' : 'Abrir link'}
                                        </a>
                                    </div>

                                    {esAdmin && (
                                        <div className="flex items-center gap-2 border-t border-gray-100 px-6 py-3 bg-gray-50">
                                            <button
                                                onClick={() => toggleActive(documento)}
                                                className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-white border-2 border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:border-gray-300 transition-all"
                                                title={documento.is_active ? 'Ocultar a vendedores' : 'Mostrar a vendedores'}
                                            >
                                                {documento.is_active ? 'Ocultar' : 'Mostrar'}
                                            </button>
                                            <Link
                                                href={route('documentos.edit', documento.id)}
                                                className="inline-flex items-center justify-center h-9 w-9 flex-shrink-0 bg-white border-2 border-[#40B0C2] text-[#40B0C2] rounded-full hover:bg-[#40B0C2] hover:text-white transition-all duration-300 transform hover:scale-105 active:scale-95"
                                                title="Editar"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => openDeleteModal(documento)}
                                                className="inline-flex items-center justify-center h-9 w-9 flex-shrink-0 bg-white border-2 border-red-500 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all duration-300 transform hover:scale-105 active:scale-95"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

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
                                            Eliminar Documento
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                ¿Estás seguro de que deseas eliminar "<strong>{documentoToDelete?.titulo}</strong>"?
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
