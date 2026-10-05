import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Dropdown from '@/Components/Dropdown';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { WHATSAPP_SUCURSALES, SUCURSAL_LABELS } from '@/lib/whatsapp';

const ESTADOS = {
    pendiente: { label: 'Pendiente', badge: 'bg-yellow-100 text-yellow-800 border border-yellow-300' },
    despachado: { label: 'Despachado', badge: 'bg-green-100 text-green-800 border border-green-300' },
    cancelado: { label: 'Cancelado', badge: 'bg-red-100 text-red-800 border border-red-300' },
};

const SUCURSAL_BADGE = {
    'buenos-aires': 'bg-sky-100 text-sky-800 border border-sky-300',
    'cordoba': 'bg-orange-100 text-orange-800 border border-orange-300',
};

const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(precio);

const formatearFechaCorta = (fecha) =>
    new Date(fecha).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

export default function Index({ pedidos, filtroEstado, filtroSucursal, puedeFiltrarSucursal, stats }) {
    const [pedidoACancelar, setPedidoACancelar] = useState(null);

    const sucursalTabs = [
        { value: 'todas', label: 'Todas' },
        ...WHATSAPP_SUCURSALES.map((s) => ({ value: s.id, label: s.nombre })),
    ];

    const totalPedidos = stats.pendientes_count + stats.despachados_count + stats.cancelados_count;

    const statCards = [
        {
            key: 'pendientes',
            label: 'Pendientes',
            value: stats.pendientes_count,
            estado: 'pendiente',
            color: 'from-yellow-400 to-yellow-500',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            key: 'despachados',
            label: 'Despachados',
            value: stats.despachados_count,
            estado: 'despachado',
            color: 'from-green-400 to-green-500',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            ),
        },
        {
            key: 'cancelados',
            label: 'Cancelados',
            value: stats.cancelados_count,
            estado: 'cancelado',
            color: 'from-red-400 to-red-500',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            ),
        },
        {
            key: 'unidades',
            label: 'Unidades vendidas',
            value: stats.unidades_vendidas.toLocaleString('es-AR'),
            estado: null,
            color: 'from-[#40B0C2] to-[#3a9db0]',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            ),
        },
        {
            key: 'facturacion',
            label: 'Facturación',
            value: formatearPrecio(stats.facturacion),
            estado: null,
            color: 'from-[#A72DAB] to-[#8f2591]',
            icon: (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .672-3 1.5S10.343 11 12 11s3 .672 3 1.5-1.343 1.5-3 1.5m0-6V6m0 9v1.5m0-9c1.11 0 2.08.402 2.599 1M9.401 15c.52.598 1.487 1 2.599 1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
    ];

    const tabs = [
        { value: 'todos', label: 'Todos', count: totalPedidos },
        { value: 'pendiente', label: 'Pendientes', count: stats.pendientes_count },
        { value: 'despachado', label: 'Despachados', count: stats.despachados_count },
        { value: 'cancelado', label: 'Cancelados', count: stats.cancelados_count },
    ];

    // Un solo helper para los dos filtros (estado y sucursal): cada uno preserva
    // el valor actual del otro, así cambiar de sucursal no resetea el tab de estado
    // ni al revés.
    const aplicarFiltros = (cambios) => {
        router.get(
            route('pedidos.index'),
            { estado: filtroEstado, sucursal: filtroSucursal, ...cambios },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const filtrarPor = (estado) => aplicarFiltros({ estado });
    const filtrarPorSucursal = (sucursal) => aplicarFiltros({ sucursal });

    const cambiarEstado = (pedido, nuevoEstado) => {
        router.patch(
            route('pedidos.cambiar-estado', pedido.id),
            { estado: nuevoEstado },
            { preserveState: true, preserveScroll: true }
        );
    };

    const confirmarCancelacion = () => {
        if (pedidoACancelar) {
            cambiarEstado(pedidoACancelar, 'cancelado');
            setPedidoACancelar(null);
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                            Pedidos
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">Gestiona los pedidos realizados por los clientes</p>
                    </div>
                    {!puedeFiltrarSucursal && SUCURSAL_LABELS[filtroSucursal] && (
                        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${SUCURSAL_BADGE[filtroSucursal] ?? 'bg-gray-100 text-gray-700 border border-gray-300'}`}>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Sucursal {SUCURSAL_LABELS[filtroSucursal]}
                        </span>
                    )}
                </div>
            }
        >
            <Head title="Pedidos" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {/* Cards de estadísticas */}
                    <div className="mb-6 px-4 sm:px-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            {statCards.map((card) => {
                                const esClickeable = card.estado !== null;
                                const activa = esClickeable && filtroEstado === card.estado;
                                const Tag = esClickeable ? 'button' : 'div';

                                return (
                                    <Tag
                                        key={card.key}
                                        {...(esClickeable ? { type: 'button', onClick: () => filtrarPor(card.estado) } : {})}
                                        className={`text-left bg-white rounded-2xl shadow-lg p-5 transition-all duration-300 ${
                                            esClickeable
                                                ? 'hover:shadow-2xl transform hover:-translate-y-1 active:scale-95 cursor-pointer'
                                                : ''
                                        } ${activa ? 'ring-2 ring-[#A72DAB]' : ''}`}
                                    >
                                        <div
                                            className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${card.color} text-white mb-3 shadow-md`}
                                        >
                                            {card.icon}
                                        </div>
                                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            {card.label}
                                        </div>
                                        <div className="mt-1 text-2xl font-bold text-gray-900 truncate">{card.value}</div>
                                    </Tag>
                                );
                            })}
                        </div>
                    </div>

                    {/* Filtro por sucursal — solo admin (el vendedor queda fijado a la suya) */}
                    {puedeFiltrarSucursal && (
                        <div className="mb-4 px-4 sm:px-0">
                            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Sucursal</p>
                                <div className="flex flex-wrap gap-2 sm:gap-3">
                                    {sucursalTabs.map((tab) => (
                                        <button
                                            key={tab.value}
                                            onClick={() => filtrarPorSucursal(tab.value)}
                                            className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg font-medium text-sm transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                                                filtroSucursal === tab.value
                                                    ? 'bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] text-white shadow-lg'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tabs de filtro por estado */}
                    <div className="mb-6 px-4 sm:px-0">
                        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
                            <div className="flex flex-wrap gap-2 sm:gap-3">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.value}
                                        onClick={() => filtrarPor(tab.value)}
                                        className={`inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg font-medium text-sm transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                                            filtroEstado === tab.value
                                                ? 'bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] text-white shadow-lg'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {tab.label}
                                        <span
                                            className={`inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full text-xs font-bold ${
                                                filtroEstado === tab.value
                                                    ? 'bg-white/25 text-white'
                                                    : 'bg-gray-300 text-gray-700'
                                            }`}
                                        >
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Grid de pedidos */}
                    <div className="px-4 sm:px-0">
                        {pedidos.data.length === 0 ? (
                            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#40B0C2]/20 to-[#A72DAB]/20 mb-4">
                                    <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <p className="text-gray-600 text-lg">No hay pedidos para mostrar</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pedidos.data.map((pedido, index) => {
                                    const estadoInfo = ESTADOS[pedido.estado];
                                    const combos = pedido.items.filter((item) => item.combo_id);
                                    // Resultado final guardado al comprar (por monto, o por llevar solo un combo con envío gratis).
                                    const tieneEnvioGratis = Boolean(pedido.envio_gratis);
                                    return (
                                        <div
                                            key={pedido.id}
                                            className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 animate-fadeInUp"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <div className="p-6">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="text-xs font-medium text-gray-500 whitespace-nowrap">
                                                        {formatearFechaCorta(pedido.created_at)}
                                                    </div>
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shrink-0 ${estadoInfo.badge}`}>
                                                        {estadoInfo.label}
                                                    </span>
                                                </div>

                                                <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                                                    <Link
                                                        href={route('pedidos.show', pedido.id)}
                                                        className="hover:text-[#40B0C2] transition-colors"
                                                    >
                                                        {pedido.cliente_nombre}
                                                    </Link>
                                                </h3>
                                                <p className="text-sm text-gray-500 mb-3">
                                                    {pedido.cliente_telefono || <span className="italic text-gray-400">Sin teléfono</span>}
                                                </p>

                                                {combos.length > 0 && (
                                                    <p className="mb-3 text-xs text-gray-500 line-clamp-2">
                                                        <span className="font-semibold text-purple-700">{combos.length === 1 ? 'Combo' : 'Combos'}:</span>{' '}
                                                        {combos.map((combo) => combo.titulo).join(', ')}
                                                    </p>
                                                )}

                                                {puedeFiltrarSucursal && SUCURSAL_LABELS[pedido.sucursal] && (
                                                    <div className="mb-4">
                                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${SUCURSAL_BADGE[pedido.sucursal] ?? 'bg-gray-100 text-gray-700 border border-gray-300'}`}>
                                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                            {SUCURSAL_LABELS[pedido.sucursal]}
                                                        </span>
                                                    </div>
                                                )}

                                                {(tieneEnvioGratis || combos.length > 0 || pedido.codigo_descuento_texto) && (
                                                    <div className="mb-2 flex flex-wrap justify-end gap-2">
                                                        {combos.length > 0 && (
                                                            <span className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-800">
                                                                {combos.length === 1 ? 'Combo' : `${combos.length} combos`}
                                                            </span>
                                                        )}
                                                        {tieneEnvioGratis && (
                                                            <span className="inline-flex items-center gap-1 rounded-full border border-green-300 bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800">
                                                                🚚 Envío gratis
                                                            </span>
                                                        )}
                                                        {pedido.codigo_descuento_texto && (
                                                            <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700">
                                                                {pedido.codigo_descuento_texto}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between py-3 px-4 mb-4 bg-gradient-to-r from-[#40B0C2]/10 to-[#A72DAB]/10 rounded-xl">
                                                    <div className="text-sm text-gray-600">
                                                        {pedido.items.length} {pedido.items.length === 1 ? 'item' : 'items'}
                                                    </div>
                                                    <div className="text-lg font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                                                        {formatearPrecio(pedido.total)}
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Link
                                                        href={route('pedidos.show', pedido.id)}
                                                        className="w-full inline-flex items-center justify-center p-3 bg-white border-2 border-[#40B0C2] text-[#40B0C2] rounded-lg hover:bg-[#40B0C2] hover:text-white transition-all duration-300 transform hover:scale-105 active:scale-95 hover:shadow-lg"
                                                    >
                                                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                        <span className="font-semibold text-sm">Ver detalle</span>
                                                    </Link>

                                                    {pedido.estado === 'pendiente' && (
                                                        <>
                                                            {/* Acciones rápidas: botones directos desde md en adelante */}
                                                            <div className="hidden md:grid grid-cols-2 gap-2">
                                                                <button
                                                                    onClick={() => cambiarEstado(pedido, 'despachado')}
                                                                    className="inline-flex items-center justify-center p-3 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-all duration-200 transform hover:scale-105 active:scale-95"
                                                                >
                                                                    Despachar
                                                                </button>
                                                                <button
                                                                    onClick={() => setPedidoACancelar(pedido)}
                                                                    className="inline-flex items-center justify-center p-3 bg-white border-2 border-red-500 text-red-500 rounded-lg text-sm font-semibold hover:bg-red-500 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95"
                                                                >
                                                                    Cancelar
                                                                </button>
                                                            </div>

                                                            {/* Acciones rápidas: menú desplegable en mobile/tablet chico */}
                                                            <div className="md:hidden">
                                                                <Dropdown>
                                                                    <Dropdown.Trigger>
                                                                        <button
                                                                            type="button"
                                                                            className="w-full inline-flex items-center justify-center gap-2 p-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-all"
                                                                        >
                                                                            Acciones rápidas
                                                                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                                            </svg>
                                                                        </button>
                                                                    </Dropdown.Trigger>
                                                                    <Dropdown.Content align="left">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => cambiarEstado(pedido, 'despachado')}
                                                                            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-green-700 hover:bg-gray-100"
                                                                        >
                                                                            Marcar como despachado
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPedidoACancelar(pedido)}
                                                                            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-gray-100"
                                                                        >
                                                                            Cancelar pedido
                                                                        </button>
                                                                    </Dropdown.Content>
                                                                </Dropdown>
                                                            </div>
                                                        </>
                                                    )}

                                                    {pedido.estado === 'despachado' && (
                                                        <button
                                                            onClick={() => cambiarEstado(pedido, 'pendiente')}
                                                            className="w-full inline-flex items-center justify-center p-3 bg-white border-2 border-yellow-500 text-yellow-700 rounded-lg text-sm font-semibold hover:bg-yellow-500 hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95"
                                                        >
                                                            Volver a pendiente
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Paginación */}
                    {pedidos.links.length > 3 && (
                        <div className="mt-6 flex flex-wrap justify-center gap-2">
                            {pedidos.links.map((link, index) => (
                                <button
                                    key={index}
                                    disabled={!link.url}
                                    onClick={() =>
                                        link.url &&
                                        router.get(link.url, {}, { preserveState: true, preserveScroll: true })
                                    }
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                        link.active
                                            ? 'bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] text-white shadow-lg'
                                            : link.url
                                            ? 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                            : 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de confirmación de cancelación */}
            {pedidoACancelar && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setPedidoACancelar(null)}></div>

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
                                        <div className="mt-2 space-y-2">
                                            <p className="text-sm text-gray-500">
                                                ¿Estás seguro de que deseas cancelar el pedido de "<strong>{pedidoACancelar.cliente_nombre}</strong>"?
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                Se va a reponer el stock de todos los productos de este pedido. Esta acción no se puede deshacer.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={confirmarCancelacion}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Cancelar pedido
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPedidoACancelar(null)}
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
