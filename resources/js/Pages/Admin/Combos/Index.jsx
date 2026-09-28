import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

export default function Index({ combos }) {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [comboToDelete, setComboToDelete] = useState(null);

    const formatearPrecio = (precio) =>
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(precio);

    const openDeleteModal = (combo) => {
        setComboToDelete(combo);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setComboToDelete(null);
    };

    const handleDelete = () => {
        if (comboToDelete) {
            router.delete(route('combos.destroy', comboToDelete.id), { onSuccess: closeDeleteModal });
        }
    };

    const toggleFeatured = (combo) => {
        router.patch(route('combos.toggle-featured', combo.id), {}, { preserveState: true, preserveScroll: true });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                            Combos
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">Paquetes de productos con precio propio</p>
                    </div>
                    <Link
                        href={route('combos.create')}
                        className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] rounded-xl font-semibold text-sm text-white hover:shadow-lg transition-all"
                    >
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nuevo Combo
                    </Link>
                </div>
            }
        >
            <Head title="Combos" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {combos.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                            <p className="text-gray-500">Todavía no hay combos creados.</p>
                            <Link href={route('combos.create')} className="mt-4 inline-block text-[#A72DAB] font-semibold hover:underline">
                                Crear el primero
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {combos.map((combo) => (
                                <div key={combo.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all overflow-hidden border border-gray-100">
                                    <div className="relative aspect-video bg-gray-100">
                                        {combo.imagen_principal ? (
                                            <img src={`/${combo.imagen_principal.ruta}`} alt={combo.titulo} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">Sin imagen</div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => toggleFeatured(combo)}
                                            className={`absolute top-2 left-2 p-2 rounded-full shadow-md transition-all ${
                                                combo.is_featured ? 'bg-yellow-400 text-white' : 'bg-white/90 text-gray-400 hover:text-yellow-500'
                                            }`}
                                            aria-label="Destacar combo"
                                        >
                                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        </button>
                                        {!combo.is_active && (
                                            <span className="absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded-full bg-gray-700 text-white">Inactivo</span>
                                        )}
                                    </div>

                                    <div className="p-5">
                                        <h3 className="font-bold text-gray-800 mb-1 truncate">{combo.titulo}</h3>
                                        <p className="text-xs text-gray-500 mb-3">
                                            {combo.items?.length ?? 0} producto{(combo.items?.length ?? 0) === 1 ? '' : 's'}
                                        </p>

                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-lg font-bold text-[#A72DAB]">{formatearPrecio(combo.precio)}</span>
                                            {combo.descuento_activo && (
                                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700">Con descuento</span>
                                            )}
                                        </div>

                                        {combo.envio_gratis && (
                                            <div className="mb-3">
                                                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full bg-[#40B0C2]/10 text-[#2f8a99]">
                                                    🚚 Envío gratis
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={route('combos.edit', combo.id)}
                                                className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-gray-100 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-all"
                                            >
                                                <Pencil className="h-4 w-4 mr-1.5" /> Editar
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => openDeleteModal(combo)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                aria-label="Eliminar combo"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showDeleteModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeDeleteModal}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">Eliminar Combo</h3>
                                <p className="mt-2 text-sm text-gray-500">
                                    ¿Estás seguro de que deseas eliminar el combo "<strong>{comboToDelete?.titulo}</strong>"? Esta acción no se puede deshacer.
                                </p>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Eliminar
                                </button>
                                <button
                                    type="button"
                                    onClick={closeDeleteModal}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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
