import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import AccionesCardAdmin from '@/Components/AccionesCardAdmin';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function Index({ planes }) {
    const { auth, flash } = usePage().props;
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [planToDelete, setPlanToDelete] = useState(null);

    const openDeleteModal = (plan) => {
        setPlanToDelete(plan);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setPlanToDelete(null);
    };

    const handleDelete = () => {
        if (planToDelete) {
            router.delete(route('planes-pago.destroy', planToDelete.id), {
                onSuccess: () => closeDeleteModal(),
            });
        }
    };

    const toggleActive = (plan) => {
        router.patch(route('planes-pago.toggle-active', plan.id), {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
                    <div>
                        <h2 className="text-2xl font-bold text-[#6000ca]">
                            Planes de Pago
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">Recargo informativo por pagar con tarjeta de crédito, según cantidad de cuotas</p>
                    </div>
                    <Link
                        href={route('planes-pago.create')}
                        className="inline-flex items-center justify-center px-6 py-3 bg-[#6000ca] border border-transparent rounded-xl font-semibold text-sm text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 focus:outline-none focus:ring-2 focus:ring-[#6000ca] focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
                    >
                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nuevo plan
                    </Link>
                </div>
            }
        >
            <Head title="Planes de Pago" />

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

                    {/* Cards para mobile (la tabla queda desde lg) */}
                    <div className="lg:hidden grid grid-cols-2 gap-3 sm:gap-4 px-4 cards-2-impar">
                        {planes.length === 0 ? (
                            <div className="admin-card col-span-full bg-white rounded-2xl shadow-lg p-8 text-center text-gray-500">No hay planes de pago registrados</div>
                        ) : (
                            planes.map((plan) => (
                                <div key={plan.id} className="admin-card bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col">
                                    <div className="flex-1 p-3 sm:p-5">
                                        <h3 className="break-words text-sm font-bold text-gray-900">{plan.nombre}</h3>

                                        <div className="mt-2 text-lg font-bold text-[#6000ca]">
                                            +{Number(plan.recargo_porcentaje).toFixed(2)}%
                                        </div>
                                        <div className="text-[11px] text-gray-500">
                                            {plan.cuotas} {Number(plan.cuotas) === 1 ? 'cuota' : 'cuotas'}
                                        </div>

                                        <span className={`mt-3 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                            plan.is_active ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-200 text-gray-600'
                                        }`}>
                                            {plan.is_active ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                    <div className="border-t border-gray-100 bg-gray-50 px-3 py-3 sm:px-5">
                                        <AccionesCardAdmin
                                            activo={plan.is_active}
                                            onToggle={() => toggleActive(plan)}
                                            editHref={route('planes-pago.edit', plan.id)}
                                            onDelete={auth.user.role === 'admin' ? () => openDeleteModal(plan) : undefined}
                                            deleteDisabled={plan.usado}
                                            deleteTitle={plan.usado ? 'No se puede eliminar: ya fue usado en pedidos' : undefined}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="admin-card hidden lg:block overflow-hidden bg-white shadow-xl sm:rounded-2xl">
                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="border-b-2 border-[#6000ca]/20">
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-[#6000ca]">
                                                Nombre
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-[#6000ca]">
                                                Cuotas
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-[#6000ca]">
                                                Recargo
                                            </th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-[#6000ca]">
                                                Estado
                                            </th>
                                            <th className="px-6 py-4 text-right text-sm font-semibold text-[#6000ca]">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {planes.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                                                    No hay planes de pago registrados
                                                </td>
                                            </tr>
                                        ) : (
                                            planes.map((plan) => {
                                                const noSePuedeEliminar = plan.usado;

                                                return (
                                                    <tr key={plan.id} className="border-b border-gray-100 hover:bg-[#6000ca]/5 transition-all duration-200">
                                                        <td className="px-6 py-5">
                                                            <span className="text-sm font-bold text-gray-900">{plan.nombre}</span>
                                                        </td>
                                                        <td className="px-6 py-5 text-sm text-gray-600">
                                                            {plan.cuotas}
                                                        </td>
                                                        <td className="px-6 py-5 text-sm font-semibold text-gray-900">
                                                            +{Number(plan.recargo_porcentaje).toFixed(2)}%
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                                                plan.is_active ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-200 text-gray-600'
                                                            }`}>
                                                                {plan.is_active ? 'Activo' : 'Inactivo'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => toggleActive(plan)}
                                                                    className={`inline-flex items-center px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
                                                                        plan.is_active
                                                                            ? 'bg-green-500 text-white hover:bg-green-600'
                                                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                                    }`}
                                                                    title={plan.is_active ? 'Desactivar' : 'Activar'}
                                                                >
                                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={plan.is_active ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'} />
                                                                    </svg>
                                                                </button>
                                                                <Link
                                                                    href={route('planes-pago.edit', plan.id)}
                                                                    className="inline-flex items-center px-3 py-1.5 bg-white border-2 border-[#6000ca] text-[#6000ca] rounded-lg hover:bg-[#6000ca] hover:text-white transition-all text-xs font-medium"
                                                                >
                                                                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                    </svg>
                                                                    Editar
                                                                </Link>
                                                                {auth.user.role === 'admin' && (
                                                                    <button
                                                                        onClick={() => openDeleteModal(plan)}
                                                                        disabled={noSePuedeEliminar}
                                                                        title={noSePuedeEliminar ? 'No se puede eliminar: ya fue usado en pedidos' : undefined}
                                                                        className="admin-delete inline-flex items-center px-3 py-1.5 bg-white border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs font-medium disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300 disabled:hover:bg-white disabled:hover:text-gray-300"
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

                        <div className="admin-card inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                        </svg>
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            Eliminar Plan de Pago
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                ¿Estás seguro de que deseas eliminar el plan "<strong>{planToDelete?.nombre}</strong>"?
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
                                    className="admin-delete w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
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
