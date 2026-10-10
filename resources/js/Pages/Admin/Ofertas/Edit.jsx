import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import OfertaDescuentoFields, { validarOfertaDescuento } from '@/Components/OfertaDescuentoFields';
import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export default function Edit({ oferta, productos }) {
    const { data, setData, put, transform, processing, errors } = useForm({
        producto_id: oferta.producto_id || '',
        tipo_descuento: oferta.tipo_descuento || 'porcentaje',
        valor_descuento: oferta.valor_descuento ?? '',
        alcance: oferta.alcance || 'todos',
        producto_escala_precio_id: oferta.alcance === 'especifico'
            ? (oferta.producto_escala_precio_id === null ? 'base' : String(oferta.producto_escala_precio_id))
            : '',
        fecha_inicio: oferta.fecha_inicio ? oferta.fecha_inicio.substring(0, 16) : '',
        fecha_fin: oferta.fecha_fin ? oferta.fecha_fin.substring(0, 16) : '',
        is_active: oferta.is_active ?? true,
    });

    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [busquedaProducto, setBusquedaProducto] = useState('');
    const [selectAbierto, setSelectAbierto] = useState(false);
    // El primer efecto de producto_id (al montar, con el producto ya guardado de la
    // oferta) no debe pisar el producto_escala_precio_id precargado desde `oferta`.
    const esPrimeraCarga = useRef(true);

    // Función para formatear precios en pesos argentinos
    const formatearPrecio = (precio) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(precio);
    };

    // Filtrar productos según búsqueda
    const productosFiltrados = productos.filter(producto =>
        producto.titulo.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
        producto.codigo?.toLowerCase().includes(busquedaProducto.toLowerCase())
    );

    useEffect(() => {
        if (data.producto_id) {
            const producto = productos.find(p => p.id == data.producto_id);
            setProductoSeleccionado(producto);
        } else {
            setProductoSeleccionado(null);
        }

        if (esPrimeraCarga.current) {
            esPrimeraCarga.current = false;
        } else {
            // Cambió el producto respecto al guardado: el precio específico elegido
            // pertenece al producto anterior, hay que volver a elegirlo.
            setData('producto_escala_precio_id', '');
        }
    }, [data.producto_id]);

    const handleSubmit = (e) => {
        e.preventDefault();

        const { esValido } = validarOfertaDescuento(data);
        if (!esValido) {
            return;
        }

        transform((data) => ({
            ...data,
            producto_escala_precio_id: data.alcance === 'especifico'
                ? (data.producto_escala_precio_id === 'base' ? null : Number(data.producto_escala_precio_id))
                : null,
        }));

        put(route('ofertas.update', oferta.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-[#6000ca]">
                        Editar Oferta
                    </h2>
                    <Link
                        href={route('ofertas.index')}
                        className="inline-flex items-center px-4 py-2 bg-white border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-300 transform hover:scale-105"
                    >
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver
                    </Link>
                </div>
            }
        >
            <Head title="Editar Oferta" />

            <div className="py-8">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="admin-card bg-white rounded-2xl shadow-xl overflow-hidden">
                        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
                            {/* Seleccionar Producto */}
                            <div className="mb-6">
                                <label htmlFor="producto_id" className="block text-sm font-bold text-gray-900 mb-2">
                                    Producto *
                                </label>
                                <div className="relative">
                                    {/* Input de búsqueda y selector */}
                                    <div 
                                        className="relative"
                                        onClick={() => setSelectAbierto(!selectAbierto)}
                                    >
                                        <div className="admin-card block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-[#6000ca] focus-within:border-transparent transition-all duration-300 hover:border-gray-300 cursor-pointer bg-white">
                                            {productoSeleccionado ? (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-900">
                                                        {productoSeleccionado.titulo} - {formatearPrecio(productoSeleccionado.precio)}
                                                    </span>
                                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between text-gray-500">
                                                    <span>Selecciona un producto</span>
                                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Dropdown con búsqueda */}
                                    {selectAbierto && (
                                        <div className="admin-card absolute z-10 mt-2 w-full bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-80 overflow-hidden animate-fadeIn">
                                            {/* Barra de búsqueda dentro del dropdown */}
                                            <div className="p-3 border-b border-gray-200 bg-gray-50">
                                                <div className="relative">
                                                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                    <input
                                                        type="text"
                                                        value={busquedaProducto}
                                                        onChange={(e) => setBusquedaProducto(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        placeholder="Buscar producto..."
                                                        className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#6000ca] focus:border-transparent transition-all"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>
                                            
                                            {/* Lista de productos */}
                                            <div className="overflow-y-auto max-h-60">
                                                {productosFiltrados.length > 0 ? (
                                                    productosFiltrados.map(producto => (
                                                        <div
                                                            key={producto.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setData('producto_id', producto.id);
                                                                setProductoSeleccionado(producto);
                                                                setSelectAbierto(false);
                                                                setBusquedaProducto('');
                                                            }}
                                                            className="px-4 py-3 hover:bg-[#6000ca]/10 cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-0"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {producto.titulo}
                                                                </span>
                                                                <span className="text-sm font-bold text-[#6000ca]">
                                                                    {formatearPrecio(producto.precio)}
                                                                </span>
                                                            </div>
                                                            {producto.codigo && (
                                                                <span className="text-xs text-gray-500">
                                                                    Código: {producto.codigo}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-8 text-center text-gray-500">
                                                        No se encontraron productos
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {errors.producto_id && (
                                    <p className="mt-2 text-sm text-red-600">{errors.producto_id}</p>
                                )}
                            </div>

                            {/* Información del producto seleccionado */}
                            {productoSeleccionado && (
                                <div className="mb-6 p-4 bg-[#6000ca]/10 rounded-xl animate-fadeIn">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Producto Seleccionado</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-600">Nombre:</span>
                                            <p className="font-medium text-gray-900">{productoSeleccionado.titulo}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Precio Original:</span>
                                            <p className="font-bold text-xl text-[#6000ca]">
                                                {formatearPrecio(productoSeleccionado.precio)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Descuento (tipo, valor, alcance y preview) */}
                            <OfertaDescuentoFields
                                producto={productoSeleccionado}
                                data={data}
                                setData={setData}
                                errors={errors}
                            />

                            {/* Grid de Fechas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                {/* Fecha de Inicio */}
                                <div>
                                    <label htmlFor="fecha_inicio" className="block text-sm font-bold text-gray-900 mb-2">
                                        Fecha de Inicio <span className="text-gray-500 font-normal">(Opcional)</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        id="fecha_inicio"
                                        value={data.fecha_inicio}
                                        onChange={e => setData('fecha_inicio', e.target.value)}
                                        className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6000ca] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02]"
                                    />
                                    {errors.fecha_inicio && (
                                        <p className="mt-2 text-sm text-red-600">{errors.fecha_inicio}</p>
                                    )}
                                    <p className="mt-1 text-xs text-gray-500">
                                        Si no se especifica, la oferta estará activa desde ya
                                    </p>
                                </div>

                                {/* Fecha de Fin */}
                                <div>
                                    <label htmlFor="fecha_fin" className="block text-sm font-bold text-gray-900 mb-2">
                                        Fecha de Fin <span className="text-gray-500 font-normal">(Opcional)</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        id="fecha_fin"
                                        value={data.fecha_fin}
                                        onChange={e => setData('fecha_fin', e.target.value)}
                                        className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6000ca] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02]"
                                        min={data.fecha_inicio}
                                    />
                                    {errors.fecha_fin && (
                                        <p className="mt-2 text-sm text-red-600">{errors.fecha_fin}</p>
                                    )}
                                    <p className="mt-1 text-xs text-gray-500">
                                        Si no se especifica, la oferta no tendrá fecha de fin
                                    </p>
                                </div>
                            </div>

                            {/* Estado Activo */}
                            <div className="mb-8">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={e => setData('is_active', e.target.checked)}
                                        className="w-5 h-5 text-[#6000ca] border-2 border-gray-300 rounded focus:ring-2 focus:ring-[#6000ca] transition-all"
                                    />
                                    <span className="ml-3 text-sm font-semibold text-gray-900">
                                        Oferta activa
                                    </span>
                                </label>
                                <p className="ml-8 mt-1 text-xs text-gray-500">
                                    Si está desactivada, la oferta no se mostrará aunque esté en el rango de fechas
                                </p>
                            </div>

                            {/* Botones */}
                            <div className="flex flex-col sm:flex-row gap-3 justify-end pt-6 border-t border-gray-200">
                                <Link
                                    href={route('ofertas.index')}
                                    className="inline-flex items-center justify-center px-6 py-3 bg-white border-2 border-gray-300 rounded-xl font-semibold text-sm text-gray-700 hover:bg-gray-50 transition-all duration-300 transform hover:scale-105"
                                >
                                    Cancelar
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center justify-center px-6 py-3 bg-[#6000ca] border border-transparent rounded-xl font-semibold text-sm text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Actualizar Oferta
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
