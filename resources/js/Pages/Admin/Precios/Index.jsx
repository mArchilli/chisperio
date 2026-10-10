import { Flame } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { resolverPrecio } from '@/lib/pricing';
import TablaPreciosPorCantidad from '@/Components/TablaPreciosPorCantidad';
import { UMBRAL_STOCK_BAJO } from '@/lib/stock';

const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(precio);

function PillButton({ active, onClick, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                active
                    ? 'bg-[#6000ca] border-transparent text-white shadow-lg shadow-purple-500/30'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-[#6000ca]/50 hover:text-[#6000ca]'
            }`}
        >
            {children}
        </button>
    );
}

function ProductoCard({ producto }) {
    const precioInfo = resolverPrecio(producto, 1);
    const tieneOferta = precioInfo.precioFinal < precioInfo.precioBase;
    const sinStock = producto.stock === 0;
    const stockBajo = producto.stock !== null && producto.stock > 0 && producto.stock <= UMBRAL_STOCK_BAJO;
    const variantes = producto.variantes_activas || [];
    const addons = producto.addons_activos || [];

    return (
        <div className="admin-card bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
            <div className="p-5">
                {/* Encabezado: imagen + título + estado */}
                <div className="flex items-start gap-3 mb-3">
                    <div className="h-14 w-14 flex-shrink-0 rounded-xl overflow-hidden bg-[#6000ca] flex items-center justify-center">
                        {producto.imagen_principal ? (
                            <img
                                src={`/${producto.imagen_principal.ruta}`}
                                alt={producto.titulo}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-white text-xl font-bold opacity-70">
                                {producto.titulo.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 leading-tight line-clamp-2">
                            {producto.titulo}
                        </h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    producto.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                                }`}
                            >
                                {producto.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                            {tieneOferta && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-orange-400 to-red-500 text-white">
                                    <Flame aria-hidden="true" className="mr-1 inline-block h-3.5 w-3.5 shrink-0 align-middle" /> {Math.round(precioInfo.ahorroTotalPorcentaje)}% OFF
                                </span>
                            )}
                            {sinStock && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-600 text-white">
                                    Sin stock
                                </span>
                            )}
                            {stockBajo && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-amber-900">
                                    Stock bajo: {producto.stock}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Subcategorías */}
                {producto.subcategorias && producto.subcategorias.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {producto.subcategorias.map((sub) => (
                            <span
                                key={sub.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gradient-to-r from-[#6000ca]/15 to-[#6000ca]/25 text-[#6000ca] border border-[#6000ca]/30"
                            >
                                {sub.nombre}
                            </span>
                        ))}
                    </div>
                )}

                {/* Precio */}
                {producto.escalas_precio && producto.escalas_precio.length > 0 ? (
                    <TablaPreciosPorCantidad producto={producto} qty={0} />
                ) : (
                    <div className="flex items-baseline gap-2 rounded-xl bg-[#f7f6f9] px-4 py-3">
                        {tieneOferta ? (
                            <>
                                <span className="text-sm text-gray-400 line-through">
                                    {formatearPrecio(precioInfo.precioBase)}
                                </span>
                                <span className="text-lg font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                                    {formatearPrecio(precioInfo.precioFinal)}
                                </span>
                            </>
                        ) : (
                            <span className="text-lg font-bold text-[#6000ca]">
                                {formatearPrecio(producto.precio)}
                            </span>
                        )}
                    </div>
                )}

                {/* Variantes de color */}
                {variantes.length > 0 && (
                    <div className="mt-4">
                        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                            Colores / variantes
                        </p>
                        <ul className="space-y-1.5">
                            {variantes.map((variante) => (
                                <li
                                    key={variante.id}
                                    className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"
                                >
                                    <span className="flex items-center gap-2 min-w-0">
                                        <span
                                            className="h-4 w-4 flex-shrink-0 rounded-full border border-gray-300"
                                            style={
                                                variante.es_color_personalizado
                                                    ? { background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }
                                                    : { backgroundColor: variante.color_hex || '#e5e7eb' }
                                            }
                                        />
                                        <span className="text-gray-700 truncate">{variante.nombre}</span>
                                    </span>
                                    <span className="flex-shrink-0 font-semibold text-gray-600">
                                        {Number(variante.precio_adicional) > 0
                                            ? `+ ${formatearPrecio(variante.precio_adicional)}`
                                            : 'Sin recargo'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Add-ons */}
                {addons.length > 0 && (
                    <div className="mt-4">
                        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                            Add-ons disponibles
                        </p>
                        <ul className="space-y-1.5">
                            {addons.map((addon) => (
                                <li
                                    key={addon.id}
                                    className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"
                                >
                                    <span className="text-gray-700 truncate">
                                        {addon.nombre}
                                        {addon.requiere_texto && (
                                            <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#6000ca]">
                                                (con texto)
                                            </span>
                                        )}
                                    </span>
                                    <span className="flex-shrink-0 font-semibold text-gray-600">
                                        + {formatearPrecio(addon.pivot?.precio_override ?? addon.precio)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Index({ productos, categorias }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoriaId, setCategoriaId] = useState(null);
    const [subcategoriaId, setSubcategoriaId] = useState(null);

    const subcategoriasDisponibles = useMemo(() => {
        if (!categoriaId) return [];
        const categoria = categorias.find((c) => c.id === categoriaId);
        return categoria?.subcategorias || [];
    }, [categorias, categoriaId]);

    const seleccionarCategoria = (id) => {
        setCategoriaId((prev) => (prev === id ? null : id));
        setSubcategoriaId(null);
    };

    const seleccionarSubcategoria = (id) => {
        setSubcategoriaId((prev) => (prev === id ? null : id));
    };

    const resetFiltros = () => {
        setSearchTerm('');
        setCategoriaId(null);
        setSubcategoriaId(null);
    };

    const productosFiltrados = useMemo(() => {
        const termino = searchTerm.trim().toLowerCase();

        return productos.filter((producto) => {
            if (termino && !producto.titulo.toLowerCase().includes(termino)) return false;

            if (categoriaId && !producto.categorias?.some((c) => c.id === categoriaId)) return false;

            if (subcategoriaId && !producto.subcategorias?.some((s) => s.id === subcategoriaId)) return false;

            return true;
        });
    }, [productos, searchTerm, categoriaId, subcategoriaId]);

    const grupos = useMemo(() => {
        const categoriasAMostrar = categoriaId
            ? categorias.filter((c) => c.id === categoriaId)
            : categorias;

        const resultado = categoriasAMostrar
            .map((categoria) => ({
                categoria,
                productos: productosFiltrados.filter((p) => p.categorias?.some((c) => c.id === categoria.id)),
            }))
            .filter((grupo) => grupo.productos.length > 0);

        if (!categoriaId) {
            const sinCategoria = productosFiltrados.filter((p) => !p.categorias || p.categorias.length === 0);
            if (sinCategoria.length > 0) {
                resultado.push({ categoria: { id: 'sin-categoria', nombre: 'Sin categoría' }, productos: sinCategoria });
            }
        }

        return resultado;
    }, [categorias, categoriaId, productosFiltrados]);

    const hayFiltrosActivos = searchTerm !== '' || categoriaId !== null || subcategoriaId !== null;

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-2xl font-bold text-[#6000ca]">
                        Precios
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Consultá precios, escalas por cantidad, colores y add-ons de todo el catálogo
                    </p>
                </div>
            }
        >
            <Head title="Precios" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {/* Barra de búsqueda y filtros */}
                    <div className="mb-6 px-4 sm:px-0">
                        <div className="admin-card bg-white rounded-2xl shadow-lg p-4 sm:p-6">
                            <div className="relative mb-4">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Buscar producto por nombre..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6000ca] focus:border-transparent transition-all"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Botonera de categorías */}
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Categoría</p>
                                <div className="flex flex-wrap gap-2">
                                    <PillButton active={categoriaId === null} onClick={() => seleccionarCategoria(null)}>
                                        Todas
                                    </PillButton>
                                    {categorias.map((categoria) => (
                                        <PillButton
                                            key={categoria.id}
                                            active={categoriaId === categoria.id}
                                            onClick={() => seleccionarCategoria(categoria.id)}
                                        >
                                            {categoria.nombre}
                                        </PillButton>
                                    ))}
                                </div>
                            </div>

                            {/* Botonera de subcategorías (solo si hay categoría elegida) */}
                            {categoriaId && subcategoriasDisponibles.length > 0 && (
                                <div className="mt-4">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Subcategoría</p>
                                    <div className="flex flex-wrap gap-2">
                                        <PillButton active={subcategoriaId === null} onClick={() => seleccionarSubcategoria(null)}>
                                            Todas
                                        </PillButton>
                                        {subcategoriasDisponibles.map((sub) => (
                                            <PillButton
                                                key={sub.id}
                                                active={subcategoriaId === sub.id}
                                                onClick={() => seleccionarSubcategoria(sub.id)}
                                            >
                                                {sub.nombre}
                                            </PillButton>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Contador de resultados */}
                            <div className="mt-4 flex items-center justify-between text-sm">
                                <span className="text-gray-600">
                                    Mostrando <span className="font-bold text-gray-900">{productosFiltrados.length}</span> de{' '}
                                    <span className="font-bold text-gray-900">{productos.length}</span> productos
                                </span>
                                {hayFiltrosActivos && (
                                    <button
                                        onClick={resetFiltros}
                                        className="inline-flex items-center px-3 py-1.5 bg-white border-2 border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-all"
                                    >
                                        Limpiar filtros
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Listado agrupado por categoría */}
                    <div className="px-4 sm:px-0 space-y-10">
                        {grupos.length === 0 ? (
                            <div className="admin-card bg-white rounded-2xl shadow-lg p-12 text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#6000ca]/20 mb-4">
                                    <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <p className="text-gray-600 text-lg mb-2">No se encontraron productos</p>
                                {hayFiltrosActivos && (
                                    <button
                                        onClick={resetFiltros}
                                        className="mt-4 inline-flex items-center px-4 py-2 bg-[#6000ca] text-white rounded-lg font-medium hover:shadow-lg transition-all"
                                    >
                                        Limpiar búsqueda y filtros
                                    </button>
                                )}
                            </div>
                        ) : (
                            grupos.map(({ categoria, productos: productosCategoria }) => (
                                <section key={categoria.id}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <h3 className="text-xl font-bold text-gray-900">{categoria.nombre}</h3>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#6000ca]/15 text-[#6000ca]">
                                            {productosCategoria.length}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                                        {productosCategoria.map((producto) => (
                                            <ProductoCard key={producto.id} producto={producto} />
                                        ))}
                                    </div>
                                </section>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
