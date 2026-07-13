import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ImageLightbox from '@/Components/ImageLightbox';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

const ESTADOS = {
    pendiente: { label: 'Pendiente', badge: 'bg-yellow-100 text-yellow-800 border border-yellow-300' },
    despachado: { label: 'Despachado', badge: 'bg-green-100 text-green-800 border border-green-300' },
    cancelado: { label: 'Cancelado', badge: 'bg-red-100 text-red-800 border border-red-300' },
};

const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(precio);

const formatearFecha = (fecha) =>
    new Date(fecha).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

function DatoCliente({ label, value }) {
    return (
        <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</div>
            <div className="text-sm text-gray-900">{value || <span className="text-gray-400 italic">Sin dato</span>}</div>
        </div>
    );
}

export default function Show({ pedido }) {
    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [confirmarCancelacion, setConfirmarCancelacion] = useState(false);

    const estadoInfo = ESTADOS[pedido.estado];

    const cambiarEstado = (nuevoEstado) => {
        router.patch(
            route('pedidos.cambiar-estado', pedido.id),
            { estado: nuevoEstado },
            { preserveScroll: true }
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
                    <div>
                        <Link
                            href={route('pedidos.index')}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-[#40B0C2] transition-colors mb-2"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                            Volver a Pedidos
                        </Link>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                                Pedido #{pedido.id}
                            </h2>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${estadoInfo.badge}`}>
                                {estadoInfo.label}
                            </span>
                        </div>
                    </div>
                </div>
            }
        >
            <Head title={`Pedido #${pedido.id}`} />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">

                    {/* Datos del cliente */}
                    <div className="px-4 sm:px-0">
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-5">Datos del cliente</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                <DatoCliente label="Nombre" value={pedido.cliente_nombre} />
                                <DatoCliente label="DNI" value={pedido.cliente_dni} />
                                <DatoCliente label="Correo electrónico" value={pedido.cliente_email} />
                                <DatoCliente label="Teléfono" value={pedido.cliente_telefono} />
                                <DatoCliente label="Provincia" value={pedido.cliente_provincia} />
                                <DatoCliente label="Dirección" value={pedido.cliente_direccion} />
                                <DatoCliente label="Código Postal" value={pedido.cliente_codigo_postal} />
                                <DatoCliente label="Fecha del pedido" value={formatearFecha(pedido.created_at)} />
                            </div>

                            {pedido.observaciones && (
                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Observaciones
                                    </div>
                                    <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl p-4 whitespace-pre-wrap">
                                        {pedido.observaciones}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Productos del pedido */}
                    <div className="px-4 sm:px-0">
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                            <div className="p-6 pb-0">
                                <h3 className="text-lg font-bold text-gray-900 mb-1">Productos del pedido</h3>
                            </div>
                            <div className="overflow-x-auto mt-4">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Producto</th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Precio unitario</th>
                                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Cantidad</th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {pedido.items.map((item) => {
                                            const ruta = item.producto?.imagen_principal?.ruta;

                                            return (
                                                <tr key={item.id}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => ruta && setLightboxSrc(`/${ruta}`)}
                                                                disabled={!ruta}
                                                                className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-[#40B0C2]/20 to-[#A72DAB]/20 border border-gray-200 flex items-center justify-center disabled:cursor-default"
                                                                title={ruta ? 'Ver imagen' : undefined}
                                                            >
                                                                {ruta ? (
                                                                    <img
                                                                        src={`/${ruta}`}
                                                                        alt={item.titulo}
                                                                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                                                                    />
                                                                ) : (
                                                                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">{item.titulo}</div>
                                                                {!item.producto && (
                                                                    <div className="text-xs text-gray-400 italic">Producto eliminado del catálogo</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 text-right whitespace-nowrap">
                                                        {formatearPrecio(item.precio_unitario)}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 text-center">
                                                        {item.cantidad}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                                                        {formatearPrecio(item.subtotal)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-50">
                                            <td colSpan={3} className="px-6 py-3 text-sm font-semibold text-gray-600 text-right">Subtotal</td>
                                            <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                                                {formatearPrecio(pedido.subtotal)}
                                            </td>
                                        </tr>
                                        <tr className="bg-gray-50">
                                            <td colSpan={3} className="px-6 py-4 text-base font-bold text-gray-900 text-right">Total</td>
                                            <td className="px-6 py-4 text-base font-bold text-right whitespace-nowrap bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                                                {formatearPrecio(pedido.total)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Acciones */}
                    <div className="px-4 sm:px-0">
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Acciones</h3>
                            {pedido.estado === 'pendiente' ? (
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={() => cambiarEstado('despachado')}
                                        className="inline-flex items-center px-5 py-2.5 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-all duration-200 transform hover:scale-105 active:scale-95"
                                    >
                                        Marcar como despachado
                                    </button>
                                    <button
                                        onClick={() => setConfirmarCancelacion(true)}
                                        className="inline-flex items-center px-5 py-2.5 bg-white border-2 border-red-500 text-red-500 rounded-lg text-sm font-semibold hover:bg-red-500 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95"
                                    >
                                        Cancelar pedido
                                    </button>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">
                                    Este pedido ya fue <strong>{estadoInfo.label.toLowerCase()}</strong>, no hay más acciones disponibles.
                                </p>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {lightboxSrc && (
                <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
            )}

            {/* Modal de confirmación de cancelación */}
            {confirmarCancelacion && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setConfirmarCancelacion(false)}></div>

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
                                            Cancelar Pedido
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                ¿Estás seguro de que deseas cancelar el pedido de "<strong>{pedido.cliente_nombre}</strong>"?
                                                Esta acción no se puede deshacer.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={() => {
                                        cambiarEstado('cancelado');
                                        setConfirmarCancelacion(false);
                                    }}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Cancelar pedido
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmarCancelacion(false)}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Volver
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
