import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const formatearFechaCorta = (fechaIso) =>
    new Date(`${fechaIso}T00:00:00`).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
    });

const formatearFechaCompleta = (fechaIso) =>
    new Date(`${fechaIso}T00:00:00`).toLocaleDateString('es-AR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
    });

const ICONOS = {
    categorias: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    ),
    subcategorias: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />,
    productos: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    ),
    ofertas: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    ),
    pedidos: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    reloj: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />,
    alerta: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    ),
    caja: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    ),
    estrella: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    ),
};

function Icon({ path, className = 'h-6 w-6' }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {path}
        </svg>
    );
}

function AccessCard({ href, params, icon, title, description }) {
    return (
        <Link href={route(href, params)} className="group block h-full">
            <div className="h-full flex flex-col overflow-hidden bg-white shadow-lg sm:rounded-2xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="p-6 flex-1">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#40B0C2]/10 to-[#A72DAB]/10">
                            <Icon path={icon} className="h-6 w-6 text-[#40B0C2]" />
                        </div>
                        <Icon
                            path={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />}
                            className="h-5 w-5 text-gray-300 group-hover:text-[#A72DAB] group-hover:translate-x-0.5 transition-all"
                        />
                    </div>
                    <h3 className="text-base font-bold text-gray-800 mb-1">{title}</h3>
                    <p className="text-sm text-gray-500">{description}</p>
                </div>
                <div className="bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] h-1"></div>
            </div>
        </Link>
    );
}

function MetricCard({ href, params, label, value, sublabel, color, icon, alert, clickable = true }) {
    const contenido = (
        <div
            className={`h-full bg-white rounded-2xl shadow-lg p-5 transition-all duration-300 ${
                clickable ? 'hover:shadow-2xl transform hover:-translate-y-1' : ''
            } ${alert ? 'ring-2 ring-amber-300' : ''}`}
        >
            <div className="flex items-center justify-between mb-3">
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${color} text-white shadow-md`}>
                    <Icon path={icon} className="h-6 w-6" />
                </div>
                <div className="flex items-center gap-2">
                    {alert && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                            Requiere atención
                        </span>
                    )}
                    {clickable && (
                        <Icon
                            path={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />}
                            className="h-4 w-4 text-gray-300"
                        />
                    )}
                </div>
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
            <div className="mt-1 text-2xl font-bold text-gray-900 truncate">{value}</div>
            {sublabel && <div className="mt-0.5 text-xs text-gray-400 truncate">{sublabel}</div>}
        </div>
    );

    if (!clickable) {
        return contenido;
    }

    return (
        <Link href={route(href, params)} className="group block h-full">
            {contenido}
        </Link>
    );
}

function ChartTooltip({ active, payload }) {
    if (!active || !payload?.length) {
        return null;
    }

    const { fecha, cantidad } = payload[0].payload;

    return (
        <div className="rounded-lg bg-white shadow-lg border border-gray-100 px-3 py-2 text-sm">
            <div className="font-semibold text-gray-800 capitalize">{formatearFechaCompleta(fecha)}</div>
            <div className="text-gray-500">
                {cantidad} {cantidad === 1 ? 'pedido' : 'pedidos'}
            </div>
        </div>
    );
}

function GraficoPedidosPorDia({ datos }) {
    const total = datos.reduce((acc, d) => acc + d.cantidad, 0);

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex flex-wrap items-center justify-between gap-1 mb-4">
                <h3 className="text-lg font-bold text-gray-900">Pedidos de los últimos 30 días</h3>
                <div className="text-sm font-medium text-gray-500 tabular-nums">
                    {total} {total === 1 ? 'pedido' : 'pedidos'} en total
                </div>
            </div>

            <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={datos} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                        <defs>
                            <linearGradient id="fillPedidos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#40B0C2" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#A72DAB" stopOpacity={0.03} />
                            </linearGradient>
                            <linearGradient id="strokePedidos" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#40B0C2" />
                                <stop offset="100%" stopColor="#A72DAB" />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="fecha"
                            tickFormatter={formatearFechaCorta}
                            tick={{ fontSize: 11, fill: '#9CA3AF' }}
                            axisLine={false}
                            tickLine={false}
                            interval={4}
                        />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={28} />
                        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#A72DAB', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Area
                            type="monotone"
                            dataKey="cantidad"
                            stroke="url(#strokePedidos)"
                            strokeWidth={2.5}
                            fill="url(#fillPedidos)"
                            dot={false}
                            activeDot={{ r: 5, fill: '#A72DAB', stroke: '#fff', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default function Dashboard({ stats }) {
    const { auth } = usePage().props;
    const {
        productos_count,
        productos_total,
        productos_sin_stock_count,
        pedidos_pendientes_count,
        pedidos_despachados_mes,
        pedidos_por_dia,
        producto_mas_vendido,
    } = stats;

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                        Dashboard
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">Hola, {auth.user.name.split(' ')[0]} · resumen operativo de la tienda</p>
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                    {/* Accesos rápidos */}
                    <div className="px-4 sm:px-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <AccessCard
                            href="categorias.index"
                            icon={ICONOS.categorias}
                            title="Categorías"
                            description="Gestiona las categorías de productos"
                        />
                        <AccessCard
                            href="subcategorias.index"
                            icon={ICONOS.subcategorias}
                            title="Subcategorías"
                            description="Gestiona las subcategorías de productos"
                        />
                        <AccessCard href="productos.index" icon={ICONOS.productos} title="Productos" description="Administra el catálogo" />
                        <AccessCard href="ofertas.index" icon={ICONOS.ofertas} title="Ofertas" description="Gestiona descuentos vigentes" />
                        <AccessCard href="pedidos.index" icon={ICONOS.pedidos} title="Pedidos" description="Pedidos de los clientes" />
                    </div>

                    {/* Métricas operativas */}
                    <div className="px-4 sm:px-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            href="pedidos.index"
                            params={{ estado: 'pendiente' }}
                            label="Pedidos pendientes"
                            value={pedidos_pendientes_count}
                            alert={pedidos_pendientes_count > 0}
                            color="from-yellow-400 to-yellow-500"
                            icon={ICONOS.reloj}
                        />

                        <MetricCard
                            href="pedidos.index"
                            params={{ estado: 'despachado' }}
                            label="Despachados este mes"
                            value={pedidos_despachados_mes}
                            color="from-green-400 to-green-500"
                            icon={ICONOS.check}
                        />

                        <MetricCard
                            href="productos.index"
                            label="Productos activos"
                            value={productos_count}
                            sublabel={`${productos_total} en total`}
                            color="from-[#40B0C2] to-[#3a9db0]"
                            icon={ICONOS.caja}
                        />

                        <MetricCard
                            label="Producto más vendido"
                            value={producto_mas_vendido ? producto_mas_vendido.nombre : 'Sin datos'}
                            sublabel={producto_mas_vendido ? `${producto_mas_vendido.unidades} unidades vendidas` : null}
                            color="from-[#A72DAB] to-[#8f2591]"
                            icon={ICONOS.estrella}
                            clickable={false}
                        />

                        {/* Solo se muestra si hay algo que atender: sin ruido cuando el conteo es 0 */}
                        {productos_sin_stock_count > 0 && (
                            <MetricCard
                                href="productos.index"
                                params={{ stock: 'sin-stock' }}
                                label="Productos sin stock"
                                value={productos_sin_stock_count}
                                alert
                                color="from-red-500 to-red-600"
                                icon={ICONOS.alerta}
                            />
                        )}
                    </div>

                    {/* Gráfico de pedidos por día */}
                    <div className="px-4 sm:px-0">
                        <GraficoPedidosPorDia datos={pedidos_por_dia} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
