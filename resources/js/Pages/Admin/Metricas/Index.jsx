import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(precio);

const formatearPrecioCorto = (precio) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(precio);

const paddear = (n) => String(n).padStart(2, '0');
const aFechaISO = (date) => `${date.getFullYear()}-${paddear(date.getMonth() + 1)}-${paddear(date.getDate())}`;
const parsearFecha = (fechaIso) => new Date(`${fechaIso}T00:00:00`);

const capitalizarInicio = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

const formatearEtiquetaPeriodo = (periodo, fechaIso) => {
    const date = parsearFecha(fechaIso);
    const texto =
        periodo === 'mensual'
            ? date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
            : date.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

    return capitalizarInicio(texto);
};

const formatearFechaCorta = (fechaIso) =>
    parsearFecha(fechaIso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

function Icon({ path, className = 'h-6 w-6' }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {path}
        </svg>
    );
}

const ICONOS = {
    facturacion: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .672-3 1.5S10.343 11 12 11s3 .672 3 1.5-1.343 1.5-3 1.5m0-6V6m0 9v1.5m0-9c1.11 0 2.08.402 2.599 1M9.401 15c.52.598 1.487 1 2.599 1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    pedidos: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    ),
    ticket: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-6 4h6m-6 4h4M5 3h14a2 2 0 012 2v14l-3-2-3 2-3-2-3 2-3-2-3 2V5a2 2 0 012-2z" />
    ),
    variacion: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />,
    trofeo: (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 21h6m-3-3v3M8 3h8l-.5 6a3.5 3.5 0 01-7 0L8 3zM5 5H3v2a4 4 0 004 4M19 5h2v2a4 4 0 01-4 4" />
    ),
};

function KpiCard({ label, value, sublabel, color, icon }) {
    return (
        <div className="h-full bg-white rounded-2xl shadow-lg p-5">
            <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${color} text-white mb-3 shadow-md`}>
                <Icon path={icon} />
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</div>
            <div className="mt-1 text-2xl font-bold text-gray-900 truncate">{value}</div>
            {sublabel}
        </div>
    );
}

function ChartTooltip({ active, payload, periodo }) {
    if (!active || !payload?.length) {
        return null;
    }

    const punto = payload[0].payload;
    const etiqueta = periodo === 'mensual' ? formatearFechaCorta(punto.fecha) : `${paddear(punto.hora)}:00 hs`;

    return (
        <div className="rounded-lg bg-white shadow-lg border border-gray-100 px-3 py-2 text-sm">
            <div className="font-semibold text-gray-800 capitalize">{etiqueta}</div>
            <div className="text-gray-500">{formatearPrecio(punto.total)}</div>
        </div>
    );
}

function GraficoFacturacion({ periodo, fecha, serie }) {
    const dataKeyEje = periodo === 'mensual' ? 'fecha' : 'hora';
    const total = serie.reduce((acc, punto) => acc + punto.total, 0);

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex flex-wrap items-center justify-between gap-1 mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                    Facturación {periodo === 'mensual' ? 'por día' : 'por hora'}
                </h3>
                <div className="text-sm font-medium text-gray-500 tabular-nums">{formatearPrecio(total)} en el período</div>
            </div>

            <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart key={`${periodo}-${fecha}`} data={serie} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                        <defs>
                            <linearGradient id="fillFacturacion" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#40B0C2" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#A72DAB" stopOpacity={0.03} />
                            </linearGradient>
                            <linearGradient id="strokeFacturacion" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#40B0C2" />
                                <stop offset="100%" stopColor="#A72DAB" />
                            </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey={dataKeyEje}
                            tickFormatter={(valor) => (periodo === 'mensual' ? formatearFechaCorta(valor) : `${paddear(valor)}h`)}
                            tick={{ fontSize: 11, fill: '#9CA3AF' }}
                            axisLine={false}
                            tickLine={false}
                            interval={periodo === 'mensual' ? 4 : 2}
                        />
                        <YAxis
                            tickFormatter={formatearPrecioCorto}
                            tick={{ fontSize: 11, fill: '#9CA3AF' }}
                            axisLine={false}
                            tickLine={false}
                            width={56}
                        />
                        <Tooltip
                            content={<ChartTooltip periodo={periodo} />}
                            cursor={{ stroke: '#A72DAB', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="total"
                            stroke="url(#strokeFacturacion)"
                            strokeWidth={2.5}
                            fill="url(#fillFacturacion)"
                            dot={false}
                            activeDot={{ r: 5, fill: '#A72DAB', stroke: '#fff', strokeWidth: 2 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function TopProductos({ productos }) {
    const max = Math.max(...productos.map((p) => p.monto), 1);

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Top 5 productos por facturación</h3>

            {productos.length === 0 ? (
                <p className="text-sm text-gray-500">Sin ventas registradas en este período.</p>
            ) : (
                <ul className="space-y-4">
                    {productos.map((producto, index) => (
                        <li key={`${producto.nombre}-${index}`}>
                            <div className="flex items-center gap-3">
                                <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-[#40B0C2] to-[#A72DAB] text-white text-xs font-bold">
                                    {index + 1}
                                </span>
                                <span className="flex-1 text-sm font-medium text-gray-800 truncate">{producto.nombre}</span>
                                <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{formatearPrecio(producto.monto)}</span>
                            </div>
                            <div className="mt-1.5 ml-10 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#40B0C2] to-[#A72DAB]"
                                    style={{ width: `${(producto.monto / max) * 100}%` }}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default function Index({ periodo, fecha, stats }) {
    const { facturacion_total, cantidad_pedidos, ticket_promedio, facturacion_serie, comparacion_periodo_anterior, top_productos } = stats;

    const irA = (nuevoPeriodo, nuevaFecha) => {
        router.get(
            route('metricas.index'),
            { periodo: nuevoPeriodo, fecha: nuevaFecha },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const navegarFecha = (delta) => {
        const nueva = parsearFecha(fecha);

        if (periodo === 'mensual') {
            nueva.setDate(1);
            nueva.setMonth(nueva.getMonth() + delta);
        } else {
            nueva.setDate(nueva.getDate() + delta);
        }

        irA(periodo, aFechaISO(nueva));
    };

    const { variacion_pct: variacionPct } = comparacion_periodo_anterior;
    const tendenciaPositiva = variacionPct !== null && variacionPct >= 0;

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                        Métricas
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">Facturación y ventas de la tienda</p>
                </div>
            }
        >
            <Head title="Métricas" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                    {/* Selector de período */}
                    <div className="px-4 sm:px-0">
                        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-5 flex flex-wrap items-center gap-3 justify-between">
                            <div className="flex gap-2">
                                {[
                                    { value: 'mensual', label: 'Mensual' },
                                    { value: 'diario', label: 'Diario' },
                                ].map((tab) => (
                                    <button
                                        key={tab.value}
                                        onClick={() => irA(tab.value, fecha)}
                                        className={`px-4 py-2 min-h-[40px] rounded-lg font-medium text-sm transition-all duration-200 ${
                                            periodo === tab.value
                                                ? 'bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] text-white shadow-lg'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => navegarFecha(-1)}
                                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#A72DAB] transition-colors"
                                    aria-label="Período anterior"
                                >
                                    <Icon
                                        path={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />}
                                        className="h-5 w-5"
                                    />
                                </button>

                                {periodo === 'mensual' ? (
                                    <input
                                        type="month"
                                        value={fecha.slice(0, 7)}
                                        onChange={(e) => irA('mensual', `${e.target.value}-01`)}
                                        className="rounded-lg border-gray-300 text-sm focus:border-[#40B0C2] focus:ring-[#40B0C2]"
                                    />
                                ) : (
                                    <input
                                        type="date"
                                        value={fecha}
                                        onChange={(e) => irA('diario', e.target.value)}
                                        className="rounded-lg border-gray-300 text-sm focus:border-[#40B0C2] focus:ring-[#40B0C2]"
                                    />
                                )}

                                <button
                                    onClick={() => navegarFecha(1)}
                                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#A72DAB] transition-colors"
                                    aria-label="Período siguiente"
                                >
                                    <Icon
                                        path={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />}
                                        className="h-5 w-5"
                                    />
                                </button>
                            </div>
                        </div>
                        <p className="mt-2 px-1 text-sm text-gray-500">{formatearEtiquetaPeriodo(periodo, fecha)}</p>
                    </div>

                    {/* KPIs */}
                    <div className="px-4 sm:px-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard
                            label="Facturación total"
                            value={formatearPrecio(facturacion_total)}
                            color="from-[#40B0C2] to-[#3a9db0]"
                            icon={ICONOS.facturacion}
                        />

                        <KpiCard
                            label="Pedidos"
                            value={cantidad_pedidos}
                            color="from-[#A72DAB] to-[#8f2591]"
                            icon={ICONOS.pedidos}
                        />

                        <KpiCard
                            label="Ticket promedio"
                            value={formatearPrecio(ticket_promedio)}
                            color="from-teal-400 to-teal-500"
                            icon={ICONOS.ticket}
                        />

                        <KpiCard
                            label="vs. período anterior"
                            value={
                                variacionPct === null ? (
                                    'Sin datos previos'
                                ) : (
                                    <span className={tendenciaPositiva ? 'text-green-600' : 'text-red-600'}>
                                        {tendenciaPositiva ? '+' : ''}
                                        {variacionPct}%
                                    </span>
                                )
                            }
                            color={variacionPct === null ? 'from-gray-300 to-gray-400' : tendenciaPositiva ? 'from-green-400 to-green-500' : 'from-red-400 to-red-500'}
                            icon={
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d={
                                        variacionPct === null
                                            ? 'M5 12h14'
                                            : tendenciaPositiva
                                            ? 'M7 11l5-5m0 0l5 5m-5-5v12'
                                            : 'M17 13l-5 5m0 0l-5-5m5 5V6'
                                    }
                                />
                            }
                            sublabel={
                                <div className="mt-0.5 text-xs text-gray-400 truncate">
                                    {formatearPrecio(comparacion_periodo_anterior.facturacion)} período anterior
                                </div>
                            }
                        />
                    </div>

                    {/* Gráfico */}
                    <div className="px-4 sm:px-0">
                        <GraficoFacturacion periodo={periodo} fecha={fecha} serie={facturacion_serie} />
                    </div>

                    {/* Top productos */}
                    <div className="px-4 sm:px-0">
                        <TopProductos productos={top_productos} />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
