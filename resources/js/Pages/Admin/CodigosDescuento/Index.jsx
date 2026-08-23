import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ codigosDescuento }) {
    const { auth, flash } = usePage().props;
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [codigoToDelete, setCodigoToDelete] = useState(null);

    const formatearPrecio = (precio) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(precio);
    };

    const formatearFecha = (fecha) => {
        if (!fecha) return 'Sin límite';
        return new Date(fecha).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'UTC',
        });
    };

    const formatearDescuento = (codigo) => {
        return codigo.tipo_descuento === 'porcentaje'
            ? `${parseFloat(codigo.valor_descuento).toFixed(0)}%`
            : formatearPrecio(codigo.valor_descuento);
    };

    // Mismo criterio que CodigoDescuento::estaVigente() en el backend, solo para
    // mostrar el badge de un vistazo (la fuente de verdad sigue siendo el server).
    const estaVigente = (codigo) => {
        if (!codigo.activo) return false;
        const hoy = new Date().toISOString().substring(0, 10);
        if (codigo.vigente_desde && hoy < codigo.vigente_desde.substring(0, 10)) return false;
        if (codigo.vigente_hasta && hoy > codigo.vigente_hasta.substring(0, 10)) return false;
        if (codigo.limite_usos !== null && codigo.usos_actuales >= codigo.limite_usos) return false;
        return true;
    };

    const openDeleteModal = (codigo) => {
        setCodigoToDelete(codigo);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setCodigoToDelete(null);
    };

    const handleDelete = () => {
        if (codigoToDelete) {
            router.delete(route('codigos-descuento.destroy', codigoToDelete.id), {
                onSuccess: () => closeDeleteModal(),
            });
        }
    };

    const toggleActive = (codigo) => {
        router.patch(route('codigos-descuento.toggle-active', codigo.id), {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                            Códigos de Descuento
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">Gestiona los códigos que los clientes pueden usar en el carrito</p>
                    </div>
                    <Link
                        href={route('codigos-descuento.create')}
                        className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] border border-transparent rounded-xl font-semibold text-sm text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 focus:outline-none focus:ring-2 focus:ring-[#A72DAB] focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
                    >
                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nuevo código
                    </Link>
                </div>
            }
        >
            <Head title="Códigos de Descuento" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="mb-6 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                            {flash.error}
                        </div>
                    )}

                    <div className="overflow-hidden bg-white shadow-xl sm:rounded-2xl">
                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b-2 border-gradient-to-r from-[#40B0C2] to-[#A72DAB]">
                                            <th className="px-6 py-4 text-left text-sm font-semibold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                                                Código
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                                                Tipo
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                                                Valor
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                                                Vigencia
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                                                Usos
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                                                Total descontado
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                                                Estado
                                            </th>
                                            <th className="px-6 py-4 text-right text-sm font-semibold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {codigosDescuento.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                                                    No hay códigos de descuento registrados
                                                </td>
                                            </tr>
                                        ) : (
                                            codigosDescuento.map((codigo) => {
                                                const noSePuedeEliminar = codigo.usos_actuales > 0;

                                                return (
                                                    <tr key={codigo.id} className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-[#40B0C2]/5 hover:to-[#A72DAB]/5 transition-all duration-200">
                                                        <td className="px-6 py-5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-bold text-gray-900">{codigo.codigo}</span>
                                                                {estaVigente(codigo) && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                                        Vigente
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5 text-sm text-gray-600">
                                                            {codigo.tipo_descuento === 'porcentaje' ? 'Porcentaje' : 'Monto fijo'}
                                                        </td>
                                                        <td className="px-6 py-5 text-sm font-semibold text-gray-900">
                                                            {formatearDescuento(codigo)}
                                                        </td>
                                                        <td className="px-6 py-5 text-xs text-gray-600">
                                                            <div>Desde: {formatearFecha(codigo.vigente_desde)}</div>
                                                            <div>Hasta: {formatearFecha(codigo.vigente_hasta)}</div>
                                                        </td>
                                                        <td className="px-6 py-5 text-sm text-gray-600">
                                                            {codigo.usos_actuales} / {codigo.limite_usos ?? '∞'}
                                                        </td>
                                                        <td className="px-6 py-5 text-sm font-semibold text-gray-900">
                                                            {formatearPrecio(codigo.total_descontado ?? 0)}
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                                                codigo.activo ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-200 text-gray-600'
                                                            }`}>
                                                                {codigo.activo ? 'Activo' : 'Inactivo'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => toggleActive(codigo)}
                                                                    className={`inline-flex items-center px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
                                                                        codigo.activo
                                                                            ? 'bg-green-500 text-white hover:bg-green-600'
                                                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                                    }`}
                                                                    title={codigo.activo ? 'Desactivar' : 'Activar'}
                                                                >
                                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={codigo.activo ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'} />
                                                                    </svg>
                                                                </button>
                                                                <Link
                                                                    href={route('codigos-descuento.edit', codigo.id)}
                                                                    className="inline-flex items-center px-3 py-1.5 bg-white border-2 border-[#40B0C2] text-[#40B0C2] rounded-lg hover:bg-[#40B0C2] hover:text-white transition-all text-xs font-medium"
                                                                >
                                                                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    </svg>
                                                                    Editar
                                                                </Link>
                                                                {auth.user.role === 'admin' && (
                                                                    <button
                                                                        onClick={() => openDeleteModal(codigo)}
                                                                        disabled={noSePuedeEliminar}
                                                                        title={noSePuedeEliminar ? 'No se puede eliminar: ya fue usado en pedidos' : undefined}
                                                                        className="inline-flex items-center px-3 py-1.5 bg-white border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs font-medium disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 disabled:hover:bg-white disabled:hover:text-gray-300"
                                                                    >
                                                                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                        </svg>
                                                                        Eliminar
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
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
                                            Eliminar Código de Descuento
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                ¿Estás seguro de que deseas eliminar el código "<strong>{codigoToDelete?.codigo}</strong>"?
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
