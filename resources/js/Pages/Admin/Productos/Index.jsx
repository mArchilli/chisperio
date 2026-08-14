import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Pencil, Trash2, Tag } from 'lucide-react';
import { resolverPrecio } from '@/lib/pricing';

export default function Index({ productos }) {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [productoToDelete, setProductoToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        estado: 'todos', // todos, activo, inactivo
        destacado: 'todos', // todos, destacado, no-destacado
        precioMin: '',
        precioMax: '',
        categoria: '',
        subcategoria: '',
    });
    const [ordenamiento, setOrdenamiento] = useState(''); // alfabetico-asc, alfabetico-desc, precio-asc, precio-desc

    // Función para formatear precios en pesos argentinos
    const formatearPrecio = (precio) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(precio);
    };

    const stripHtml = (html) => {
        if (!html) return '';
        const div = document.createElement('div');
        div.innerHTML = DOMPurify.sanitize(html);
        return div.textContent || '';
    };

    const openDeleteModal = (producto) => {
        setProductoToDelete(producto);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setProductoToDelete(null);
    };

    const handleDelete = () => {
        if (productoToDelete) {
            router.delete(route('productos.destroy', productoToDelete.id), {
                onSuccess: () => closeDeleteModal(),
            });
        }
    };

    const toggleFeatured = (producto) => {
        router.patch(route('productos.toggle-featured', producto.id), {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const resetFilters = () => {
        setFilters({
            estado: 'todos',
            destacado: 'todos',
            precioMin: '',
            precioMax: '',
            categoria: '',
            subcategoria: '',
        });
        setSearchTerm('');
        setOrdenamiento('');
    };

    // Extraer categorías únicas de los productos
    const categorias = useMemo(() => {
        const cats = new Map();
        productos.forEach(producto => {
            producto.categorias?.forEach(cat => {
                if (!cats.has(cat.id)) {
                    cats.set(cat.id, cat);
                }
            });
        });
        return Array.from(cats.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [productos]);

    // Extraer subcategorías de la categoría seleccionada
    const subcategorias = useMemo(() => {
        if (!filters.categoria) return [];
        const subs = new Map();
        productos.forEach(producto => {
            if (producto.categorias?.some(cat => cat.id == filters.categoria)) {
                producto.subcategorias?.forEach(sub => {
                    if (!subs.has(sub.id)) {
                        subs.set(sub.id, sub);
                    }
                });
            }
        });
        return Array.from(subs.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [productos, filters.categoria]);

    const productosFiltrados = useMemo(() => {
        let resultado = productos.filter(producto => {
            // Filtro de búsqueda
            const matchSearch = producto.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                (producto.descripcion && stripHtml(producto.descripcion).toLowerCase().includes(searchTerm.toLowerCase()));
            
            if (!matchSearch) return false;

            // Filtro de estado
            if (filters.estado !== 'todos') {
                const isActive = filters.estado === 'activo';
                if (producto.is_active !== isActive) return false;
            }

            // Filtro de destacado
            if (filters.destacado !== 'todos') {
                const isFeatured = filters.destacado === 'destacado';
                if (producto.is_featured !== isFeatured) return false;
            }

            // Filtro de precio mínimo
            if (filters.precioMin && parseFloat(producto.precio) < parseFloat(filters.precioMin)) {
                return false;
            }

            // Filtro de precio máximo
            if (filters.precioMax && parseFloat(producto.precio) > parseFloat(filters.precioMax)) {
                return false;
            }

            // Filtro de categoría
            if (filters.categoria) {
                const tieneCategoria = producto.categorias?.some(cat => cat.id == filters.categoria);
                if (!tieneCategoria) return false;
            }

            // Filtro de subcategoría
            if (filters.subcategoria) {
                const tieneSubcategoria = producto.subcategorias?.some(sub => sub.id == filters.subcategoria);
                if (!tieneSubcategoria) return false;
            }

            return true;
        });

        // Aplicar ordenamiento
        if (ordenamiento) {
            resultado = [...resultado].sort((a, b) => {
                switch (ordenamiento) {
                    case 'alfabetico-asc':
                        return a.titulo.localeCompare(b.titulo);
                    case 'alfabetico-desc':
                        return b.titulo.localeCompare(a.titulo);
                    case 'precio-asc':
                        return parseFloat(a.precio) - parseFloat(b.precio);
                    case 'precio-desc':
                        return parseFloat(b.precio) - parseFloat(a.precio);
                    default:
                        return 0;
                }
            });
        }

        return resultado;
    }, [productos, searchTerm, filters, ordenamiento]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.estado !== 'todos') count++;
        if (filters.destacado !== 'todos') count++;
        if (filters.precioMin) count++;
        if (filters.precioMax) count++;
        if (filters.categoria) count++;
        if (filters.subcategoria) count++;
        if (ordenamiento) count++;
        return count;
    }, [filters, ordenamiento]);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                            Productos
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">Gestiona el catálogo de productos</p>
                    </div>
                    <Link
                        href={route('productos.create')}
                        className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] border border-transparent rounded-xl font-semibold text-sm text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 focus:outline-none focus:ring-2 focus:ring-[#A72DAB] focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
                    >
                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nuevo Producto
                    </Link>
                </div>
            }
        >
            <Head title="Productos" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {/* Barra de búsqueda y filtros */}
                    <div className="mb-6 px-4 sm:px-0">
                        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
                            {/* Barra de búsqueda */}
                            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                                <div className="flex-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Buscar productos por nombre o descripción..."
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
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] border-2 border-transparent rounded-xl font-semibold text-sm text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 relative"
                                >
                                    <svg 
                                        className={`h-5 w-5 mr-2 transition-transform duration-500 ${showFilters ? 'rotate-180' : 'rotate-0'}`} 
                                        fill="none" 
                                        viewBox="0 0 24 24" 
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                    </svg>
                                    {showFilters ? 'Ocultar Filtros' : 'Filtros'}
                                    {activeFiltersCount > 0 && (
                                        <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full animate-pulse shadow-lg shadow-red-500/50">
                                            {activeFiltersCount}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* Panel de filtros avanzados */}
                            <div 
                                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                                    showFilters ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                                }`}
                            >
                                <div className="border-t-2 border-gray-100 pt-4">
                                    {/* Sección de Ordenamiento */}
                                    <div className="mb-6 pb-6 border-b border-gray-200">
                                        <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center">
                                            <svg className="h-5 w-5 mr-2 text-[#A72DAB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                                            </svg>
                                            Ordenar por
                                        </label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <button
                                                onClick={() => setOrdenamiento('alfabetico-asc')}
                                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                                                    ordenamiento === 'alfabetico-asc'
                                                        ? 'bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] text-white shadow-lg'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                A → Z
                                            </button>
                                            <button
                                                onClick={() => setOrdenamiento('alfabetico-desc')}
                                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                                                    ordenamiento === 'alfabetico-desc'
                                                        ? 'bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] text-white shadow-lg'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                Z → A
                                            </button>
                                            <button
                                                onClick={() => setOrdenamiento('precio-asc')}
                                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                                                    ordenamiento === 'precio-asc'
                                                        ? 'bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] text-white shadow-lg'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                $ Menor
                                            </button>
                                            <button
                                                onClick={() => setOrdenamiento('precio-desc')}
                                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                                                    ordenamiento === 'precio-desc'
                                                        ? 'bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] text-white shadow-lg'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                            >
                                                $ Mayor
                                            </button>
                                        </div>
                                    </div>

                                    {/* Filtros */}
                                    <label className="block text-sm font-bold text-gray-900 mb-3 flex items-center">
                                        <svg className="h-5 w-5 mr-2 text-[#A72DAB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                        </svg>
                                        Filtros
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {/* Filtro por categoría */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Categoría
                                            </label>
                                            <select
                                                value={filters.categoria}
                                                onChange={(e) => {
                                                    handleFilterChange('categoria', e.target.value);
                                                    handleFilterChange('subcategoria', '');
                                                }}
                                                className="block w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#A72DAB] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02]"
                                            >
                                                <option value="">Todas las categorías</option>
                                                {categorias.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Filtro por subcategoría */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Subcategoría
                                            </label>
                                            <select
                                                value={filters.subcategoria}
                                                onChange={(e) => handleFilterChange('subcategoria', e.target.value)}
                                                disabled={!filters.categoria}
                                                className="block w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#A72DAB] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02] disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                <option value="">
                                                    {filters.categoria ? 'Todas las subcategorías' : 'Selecciona una categoría primero'}
                                                </option>
                                                {subcategorias.map(sub => (
                                                    <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Filtro por estado */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Estado
                                            </label>
                                            <select
                                                value={filters.estado}
                                                onChange={(e) => handleFilterChange('estado', e.target.value)}
                                                className="block w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#A72DAB] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02]"
                                            >
                                                <option value="todos">Todos</option>
                                                <option value="activo">Activos</option>
                                                <option value="inactivo">Inactivos</option>
                                            </select>
                                        </div>

                                        {/* Filtro por destacado */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Destacado
                                            </label>
                                            <select
                                                value={filters.destacado}
                                                onChange={(e) => handleFilterChange('destacado', e.target.value)}
                                                className="block w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#A72DAB] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02]"
                                            >
                                                <option value="todos">Todos</option>
                                                <option value="destacado">Destacados</option>
                                                <option value="no-destacado">No destacados</option>
                                            </select>
                                        </div>

                                        {/* Filtro precio mínimo */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Precio Mínimo
                                            </label>
                                            <input
                                                type="number"
                                                placeholder="$0.00"
                                                value={filters.precioMin}
                                                onChange={(e) => handleFilterChange('precioMin', e.target.value)}
                                                className="block w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#A72DAB] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02]"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>

                                        {/* Filtro precio máximo */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Precio Máximo
                                            </label>
                                            <input
                                                type="number"
                                                placeholder="$9999.99"
                                                value={filters.precioMax}
                                                onChange={(e) => handleFilterChange('precioMax', e.target.value)}
                                                className="block w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#A72DAB] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02]"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>

                                    {/* Botón para limpiar filtros */}
                                    {(activeFiltersCount > 0 || searchTerm) && (
                                        <div className="mt-4 flex justify-end">
                                            <button
                                                onClick={resetFilters}
                                                className="inline-flex items-center px-4 py-2 bg-white border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 active:scale-95 hover:border-gray-400 hover:shadow-md"
                                            >
                                                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Limpiar filtros
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Contador de resultados */}
                            <div className="mt-4 flex items-center justify-between text-sm transition-all duration-300">
                                <span className="text-gray-600">
                                    Mostrando <span className="font-bold text-gray-900 transition-all duration-300">{productosFiltrados.length}</span> de <span className="font-bold text-gray-900">{productos.length}</span> productos
                                </span>
                                {(activeFiltersCount > 0 || searchTerm) && (
                                    <span className="text-[#A72DAB] font-semibold animate-fadeIn flex items-center gap-2">
                                        <span className="inline-block animate-pulse">🔍</span> Filtros activos
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Vista de Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-0">
                        {productosFiltrados.length === 0 ? (
                            <div className="col-span-full bg-white rounded-2xl shadow-lg p-12 text-center animate-fadeIn">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#40B0C2]/20 to-[#A72DAB]/20 mb-4">
                                    <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <p className="text-gray-600 text-lg mb-2">
                                    {productos.length === 0 ? 'No hay productos registrados' : 'No se encontraron productos'}
                                </p>
                                {(activeFiltersCount > 0 || searchTerm) && (
                                    <button
                                        onClick={resetFilters}
                                        className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 animate-fadeIn"
                                    >
                                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Limpiar búsqueda y filtros
                                    </button>
                                )}
                            </div>
                        ) : (
                            productosFiltrados.map((producto, index) => {
                                const precioInfo = resolverPrecio(producto, 1);
                                const tieneOferta = precioInfo.precioFinal < precioInfo.precioBase;

                                return (
                                <div
                                    key={producto.id}
                                    className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 animate-fadeInUp"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    {/* Header de la card con imagen/icono */}
                                    <div className="relative aspect-[4/5] bg-gradient-to-br from-[#40B0C2] to-[#A72DAB] overflow-hidden">
                                        {producto.imagen_principal ? (
                                            <img
                                                src={`/${producto.imagen_principal.ruta}`}
                                                alt={producto.titulo}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <div 
                                            className="absolute inset-0 flex items-center justify-center"
                                            style={{ display: producto.imagen_principal ? 'none' : 'flex' }}
                                        >
                                            <div className="text-white text-6xl font-bold opacity-30">
                                                {producto.titulo.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                        
                                        {/* Botón de destacar en la esquina superior izquierda */}
                                        <div className="absolute top-3 left-3 z-10">
                                            <button
                                                onClick={() => toggleFeatured(producto)}
                                                className={`inline-flex items-center justify-center p-2.5 rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg ${
                                                    producto.is_featured 
                                                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-yellow-500/50 hover:shadow-xl scale-110' 
                                                        : 'bg-white/90 backdrop-blur-sm border-2 border-yellow-400 text-yellow-600 hover:bg-yellow-50'
                                                }`}
                                                title={producto.is_featured ? 'Quitar destacado' : 'Destacar producto'}
                                            >
                                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            </button>
                                        </div>
                                        
                                        {/* Badges en la esquina superior derecha */}
                                        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                                            {producto.is_featured && (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-400 text-yellow-900 shadow-lg animate-bounceIn">
                                                    ⭐ Destacado
                                                </span>
                                            )}
                                            {tieneOferta && (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-lg animate-bounceIn">
                                                    🔥 {Math.round(precioInfo.ahorroTotalPorcentaje)}% OFF
                                                </span>
                                            )}
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                                                producto.is_active 
                                                    ? 'bg-green-400 text-green-900' 
                                                    : 'bg-red-400 text-red-900'
                                            }`}>
                                                {producto.is_active ? '✓ Activo' : '✕ Inactivo'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Contenido de la card */}
                                    <div className="p-4">
                                        {/* Categorías y Subcategorías */}
                                        {((producto.categorias && producto.categorias.length > 0) ||
                                          (producto.subcategorias && producto.subcategorias.length > 0)) ? (
                                            <div className="flex flex-wrap gap-1.5 items-center mb-2">
                                                {/* Categorías */}
                                                {producto.categorias && producto.categorias.map((categoria) => (
                                                    <span
                                                        key={`cat-${categoria.id}`}
                                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gradient-to-r from-[#40B0C2]/20 to-[#40B0C2]/30 text-[#40B0C2] border border-[#40B0C2]/40"
                                                    >
                                                        {categoria.nombre}
                                                    </span>
                                                ))}

                                                {/* Subcategorías */}
                                                {producto.subcategorias && producto.subcategorias.map((subcategoria) => (
                                                    <span
                                                        key={`sub-${subcategoria.id}`}
                                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gradient-to-r from-[#A72DAB]/20 to-[#A72DAB]/30 text-[#A72DAB] border border-[#A72DAB]/40"
                                                    >
                                                        {subcategoria.nombre}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-[11px] text-gray-400 italic mb-2">
                                                Sin categorías asignadas
                                            </div>
                                        )}

                                        {/* Título */}
                                        <h3 className="text-base font-bold text-gray-900 mb-1 line-clamp-1">
                                            {producto.titulo}
                                        </h3>

                                        {/* Descripción */}
                                        {producto.descripcion ? (
                                            <div
                                                className="quill-content text-xs text-gray-600 mb-2 line-clamp-2 min-h-[32px]"
                                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(producto.descripcion) }}
                                            />
                                        ) : (
                                            <p className="text-xs text-gray-600 mb-2 min-h-[32px]">
                                                <span className="text-gray-400 italic">Sin descripción disponible</span>
                                            </p>
                                        )}

                                        {/* Precio */}
                                        <div className="flex items-baseline gap-2 mb-3">
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
                                                <span className="text-lg font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                                                    {formatearPrecio(producto.precio)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Botones de acción */}
                                        <div className="flex items-center gap-2">
                                            {/* Botón de crear/gestionar oferta */}
                                            {producto.oferta_vigente ? (
                                                <Link
                                                    href={route('ofertas.edit', producto.oferta_vigente.id)}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-xs font-semibold hover:shadow-md transition-all duration-300 transform hover:scale-[1.02] active:scale-95"
                                                    title="Gestionar oferta"
                                                >
                                                    <Tag className="h-3.5 w-3.5" />
                                                    Gestionar Oferta
                                                </Link>
                                            ) : (
                                                <Link
                                                    href={route('ofertas.create', { producto_id: producto.id })}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border-2 border-orange-500 text-orange-500 rounded-lg text-xs font-semibold hover:bg-orange-500 hover:text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-95"
                                                    title="Crear oferta"
                                                >
                                                    <Tag className="h-3.5 w-3.5" />
                                                    Crear Oferta
                                                </Link>
                                            )}

                                            {/* Botones de editar y eliminar */}
                                            <Link
                                                href={route('productos.edit', producto.id)}
                                                className="inline-flex items-center justify-center h-9 w-9 flex-shrink-0 bg-white border-2 border-[#40B0C2] text-[#40B0C2] rounded-full hover:bg-[#40B0C2] hover:text-white transition-all duration-300 transform hover:scale-105 active:scale-95"
                                                title="Editar"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => openDeleteModal(producto)}
                                                className="inline-flex items-center justify-center h-9 w-9 flex-shrink-0 bg-white border-2 border-red-500 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all duration-300 transform hover:scale-105 active:scale-95"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                );
                            })
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
                                            Eliminar Producto
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                ¿Estás seguro de que deseas eliminar el producto "<strong>{productoToDelete?.titulo}</strong>"? 
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
