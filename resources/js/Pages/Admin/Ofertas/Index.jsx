import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useMemo } from 'react';

export default function Index({ ofertas }) {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [ofertaToDelete, setOfertaToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Función para formatear precios en pesos argentinos
    const formatearPrecio = (precio) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(precio);
    };

    // Función para formatear fechas
    const formatearFecha = (fecha) => {
        if (!fecha) return 'Sin fecha';
        return new Date(fecha).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const openDeleteModal = (oferta) => {
        setOfertaToDelete(oferta);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setOfertaToDelete(null);
    };

    const handleDelete = () => {
        if (ofertaToDelete) {
            router.delete(route('ofertas.destroy', ofertaToDelete.id), {
                onSuccess: () => closeDeleteModal(),
            });
        }
    };

    const toggleActive = (oferta) => {
        router.patch(route('ofertas.toggle-active', oferta.id), {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Describe a qué nivel de precio del producto aplica la oferta, para que el
    // admin distinga de un vistazo varias ofertas sobre el mismo producto.
    const describirAlcance = (oferta) => {
        if (oferta.alcance === 'todos') return 'Todos los precios';
        if (oferta.escala_precio) return `Solo ${oferta.escala_precio.cantidad_minima}+ unidades`;
        return 'Solo precio base';
    };

    const formatearDescuento = (oferta) => {
        return oferta.tipo_descuento === 'porcentaje'
            ? `${parseFloat(oferta.valor_descuento).toFixed(0)}%`
            : formatearPrecio(oferta.valor_descuento);
    };

    // Verificar si una oferta está vigente
    const estaVigente = (oferta) => {
        if (!oferta.is_active) return false;
        const ahora = new Date();
        const inicio = oferta.fecha_inicio ? new Date(oferta.fecha_inicio) : null;
        const fin = oferta.fecha_fin ? new Date(oferta.fecha_fin) : null;

        if (inicio && ahora < inicio) return false;
        if (fin && ahora > fin) return false;

        return true;
    };

    const ofertasFiltradas = useMemo(() => {
        return ofertas.filter(oferta => {
            const matchSearch = oferta.producto.titulo.toLowerCase().includes(searchTerm.toLowerCase());
            return matchSearch;
        });
    }, [ofertas, searchTerm]);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                            Ofertas
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">Gestiona las ofertas de productos</p>
                    </div>
                    <Link
                        href={route('ofertas.create')}
                        className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] border border-transparent rounded-xl font-semibold text-sm text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 focus:outline-none focus:ring-2 focus:ring-[#A72DAB] focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
                    >
                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nueva Oferta
                    </Link>
                </div>
            }
        >
            <Head title="Ofertas" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {/* Barra de búsqueda */}
                    <div className="mb-6 px-4 sm:px-0">
                        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Buscar por producto..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#A72DAB] focus:border-transparent transition-all"
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
                        </div>
                    </div>

                    {/* Grid de Cards de Ofertas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-0">
                        {ofertasFiltradas.length === 0 ? (
                            <div className="col-span-full bg-white rounded-2xl shadow-lg p-12 text-center animate-fadeIn">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#40B0C2]/20 to-[#A72DAB]/20 mb-4">
                                    <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                </div>
                                <p className="text-gray-600 text-lg mb-2">
                                    {ofertas.length === 0 ? 'No hay ofertas registradas' : 'No se encontraron ofertas'}
                                </p>
                            </div>
                        ) : (
                            ofertasFiltradas.map((oferta, index) => (
                                <div 
                                    key={oferta.id} 
                                    className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 animate-fadeInUp"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    {/* Header con producto */}
                                    <div className="relative h-32 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                                        <div className="text-white text-5xl font-bold opacity-30">
                                            {formatearDescuento(oferta)}
                                        </div>

                                        {/* Badge de estado */}
                                        <div className="absolute top-3 right-3 flex flex-col gap-2">
                                            {estaVigente(oferta) && (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-400 text-green-900 shadow-lg animate-bounceIn">
                                                    ✓ Vigente
                                                </span>
                                            )}
                                            {!oferta.is_active && (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-400 text-gray-900 shadow-lg">
                                                    ✕ Inactiva
                                                </span>
                                            )}
                                        </div>

                                        {/* Badge de alcance */}
                                        <div className="absolute top-3 left-3">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/90 text-gray-800 shadow-lg">
                                                {describirAlcance(oferta)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Contenido */}
                                    <div className="p-6">
                                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                                            {oferta.producto.titulo}
                                        </h3>

                                        {/* Precios */}
                                        <div className="mb-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm text-gray-600">Precio original:</span>
                                                <span className="text-sm line-through text-gray-500">
                                                    {formatearPrecio(oferta.producto.precio)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-semibold text-gray-900">Descuento:</span>
                                                <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                                                    {formatearDescuento(oferta)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Fechas */}
                                        <div className="mb-4 space-y-1 text-xs text-gray-600">
                                            <div className="flex justify-between">
                                                <span>Inicio:</span>
                                                <span className="font-medium">{formatearFecha(oferta.fecha_inicio)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Fin:</span>
                                                <span className="font-medium">{formatearFecha(oferta.fecha_fin)}</span>
                                            </div>
                                        </div>

                                        {/* Botones de acción */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                onClick={() => toggleActive(oferta)}
                                                className={`inline-flex items-center justify-center p-3 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                                                    oferta.is_active 
                                                        ? 'bg-green-500 text-white hover:bg-green-600' 
                                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                }`}
                                                title={oferta.is_active ? 'Desactivar' : 'Activar'}
                                            >
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={oferta.is_active ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
                                                </svg>
                                            </button>
                                            <Link
                                                href={route('ofertas.edit', oferta.id)}
                                                className="inline-flex items-center justify-center p-3 bg-white border-2 border-[#40B0C2] text-[#40B0C2] rounded-lg hover:bg-[#40B0C2] hover:text-white transition-all duration-300 transform hover:scale-105 active:scale-95"
                                                title="Editar"
                                            >
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </Link>
                                            <button
                                                onClick={() => openDeleteModal(oferta)}
                                                className="inline-flex items-center justify-center p-3 bg-white border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all duration-300 transform hover:scale-105 active:scale-95"
                                                title="Eliminar"
                                            >
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
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
                                            Eliminar Oferta
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                ¿Estás seguro de que deseas eliminar la oferta del producto "<strong>{ofertaToDelete?.producto.titulo}</strong>"? 
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
