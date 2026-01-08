import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Edit({ producto, categorias, subcategorias }) {
    const { data, setData, put, post, processing, errors } = useForm({
        titulo: producto.titulo || '',
        descripcion: producto.descripcion || '',
        precio: producto.precio || '',
        categorias: producto.categorias?.map(c => c.id) || [],
        subcategorias: producto.subcategorias?.map(s => s.id) || [],
        is_active: producto.is_active ?? true,
        is_featured: producto.is_featured ?? false,
        imagenes: [],
        videos: [],
        imagen_principal: null,
        media_eliminar: [],
    });

    const [imagenesPreview, setImagenesPreview] = useState([]);
    const [videosPreview, setVideosPreview] = useState([]);
    const [mediaExistente, setMediaExistente] = useState(producto.media || []);

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('productos.update', producto.id), {
            _method: 'put'
        });
    };

    const handleImagenesChange = (e) => {
        const files = Array.from(e.target.files);
        setData('imagenes', [...data.imagenes, ...files]);
        
        const previews = files.map(file => ({
            file,
            url: URL.createObjectURL(file),
            name: file.name
        }));
        setImagenesPreview([...imagenesPreview, ...previews]);
    };

    const handleVideosChange = (e) => {
        const files = Array.from(e.target.files);
        setData('videos', [...data.videos, ...files]);
        
        const previews = files.map(file => ({
            file,
            url: URL.createObjectURL(file),
            name: file.name
        }));
        setVideosPreview([...videosPreview, ...previews]);
    };

    const removeImagenNueva = (index) => {
        const newImagenes = data.imagenes.filter((_, i) => i !== index);
        setData('imagenes', newImagenes);
        setImagenesPreview(imagenesPreview.filter((_, i) => i !== index));
    };

    const removeVideoNuevo = (index) => {
        const newVideos = data.videos.filter((_, i) => i !== index);
        setData('videos', newVideos);
        setVideosPreview(videosPreview.filter((_, i) => i !== index));
    };

    const eliminarMediaExistente = (mediaId) => {
        setMediaExistente(mediaExistente.filter(m => m.id !== mediaId));
        setData('media_eliminar', [...data.media_eliminar, mediaId]);
    };

    const toggleCategoria = (categoriaId) => {
        const newCategorias = data.categorias.includes(categoriaId)
            ? data.categorias.filter(id => id !== categoriaId)
            : [...data.categorias, categoriaId];
        setData('categorias', newCategorias);
    };

    const toggleSubcategoria = (subcategoriaId) => {
        const newSubcategorias = data.subcategorias.includes(subcategoriaId)
            ? data.subcategorias.filter(id => id !== subcategoriaId)
            : [...data.subcategorias, subcategoriaId];
        setData('subcategorias', newSubcategorias);
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                        Editar Producto
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">Modifica los datos del producto "{producto.titulo}"</p>
                </div>
            }
        >
            <Head title={`Editar ${producto.titulo}`} />

            <div className="py-8">
                <div className="mx-auto max-w-4xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-xl sm:rounded-2xl">
                        <div className="p-8">
                            <form onSubmit={handleSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="md:col-span-2">
                                        <label htmlFor="titulo" className="block text-sm font-bold text-gray-700 mb-2">
                                            Título <span className="text-[#A72DAB]">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="titulo"
                                            value={data.titulo}
                                            onChange={(e) => setData('titulo', e.target.value)}
                                            className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50 transition-all"
                                            required
                                        />
                                        {errors.titulo && (
                                            <div className="mt-2 flex items-center text-sm text-red-600">
                                                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                {errors.titulo}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="precio" className="block text-sm font-bold text-gray-700 mb-2">
                                            Precio <span className="text-[#A72DAB]">*</span>
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                                            <input
                                                type="number"
                                                id="precio"
                                                step="0.01"
                                                min="0"
                                                value={data.precio}
                                                onChange={(e) => setData('precio', e.target.value)}
                                                className="block w-full pl-8 rounded-xl border-gray-300 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50 transition-all"
                                                required
                                            />
                                        </div>
                                        {errors.precio && (
                                            <div className="mt-2 flex items-center text-sm text-red-600">
                                                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                {errors.precio}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="is_active"
                                                checked={data.is_active}
                                                onChange={(e) => setData('is_active', e.target.checked)}
                                                className="h-5 w-5 rounded border-gray-300 text-[#40B0C2] focus:ring-[#40B0C2]"
                                            />
                                            <label htmlFor="is_active" className="ml-3 block text-sm font-bold text-gray-700">
                                                Producto Activo
                                            </label>
                                        </div>

                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="is_featured"
                                                checked={data.is_featured}
                                                onChange={(e) => setData('is_featured', e.target.checked)}
                                                className="h-5 w-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                                            />
                                            <label htmlFor="is_featured" className="ml-3 flex items-center text-sm font-bold text-gray-700">
                                                ⭐ Producto Destacado
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label htmlFor="descripcion" className="block text-sm font-bold text-gray-700 mb-2">
                                        Descripción
                                    </label>
                                    <textarea
                                        id="descripcion"
                                        value={data.descripcion}
                                        onChange={(e) => setData('descripcion', e.target.value)}
                                        rows="4"
                                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50 transition-all resize-none"
                                    />
                                    {errors.descripcion && (
                                        <div className="mt-2 flex items-center text-sm text-red-600">
                                            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            {errors.descripcion}
                                        </div>
                                    )}
                                </div>

                                {/* Sección Multimedia */}
                                <div className="mb-8 p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                        <svg className="h-5 w-5 mr-2 text-[#40B0C2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Multimedia
                                    </h3>

                                    {/* Imágenes Existentes */}
                                    {mediaExistente.filter(m => m.tipo === 'imagen').length > 0 && (
                                        <div className="mb-6">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                Imágenes Actuales
                                            </label>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                {mediaExistente.filter(m => m.tipo === 'imagen').map((media) => (
                                                    <div key={media.id} className="relative group">
                                                        <img
                                                            src={`/${media.ruta}`}
                                                            alt="Producto"
                                                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => eliminarMediaExistente(media.id)}
                                                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                        {media.is_principal && (
                                                            <span className="absolute bottom-2 left-2 px-2 py-1 text-xs rounded-full bg-yellow-500 text-white">
                                                                ⭐ Principal
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Nuevas Imágenes */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            Agregar Imágenes
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImagenesChange}
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-[#40B0C2] file:to-[#A72DAB] file:text-white hover:file:opacity-90 file:cursor-pointer"
                                        />
                                        
                                        {imagenesPreview.length > 0 && (
                                            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                                                {imagenesPreview.map((preview, index) => (
                                                    <div key={index} className="relative group">
                                                        <img
                                                            src={preview.url}
                                                            alt={preview.name}
                                                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeImagenNueva(index)}
                                                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Videos Existentes */}
                                    {mediaExistente.filter(m => m.tipo === 'video').length > 0 && (
                                        <div className="mb-6">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                Videos Actuales
                                            </label>
                                            <div className="space-y-2 mb-4">
                                                {mediaExistente.filter(m => m.tipo === 'video').map((media) => (
                                                    <div key={media.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                                        <div className="flex items-center">
                                                            <svg className="h-5 w-5 text-[#40B0C2] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                            <span className="text-sm text-gray-700">{media.ruta.split('/').pop()}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => eliminarMediaExistente(media.id)}
                                                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Nuevos Videos */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            Agregar Videos
                                        </label>
                                        <input
                                            type="file"
                                            accept="video/*"
                                            multiple
                                            onChange={handleVideosChange}
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-[#40B0C2] file:to-[#A72DAB] file:text-white hover:file:opacity-90 file:cursor-pointer"
                                        />
                                        
                                        {videosPreview.length > 0 && (
                                            <div className="mt-4 space-y-2">
                                                {videosPreview.map((preview, index) => (
                                                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                                        <div className="flex items-center">
                                                            <svg className="h-5 w-5 text-[#40B0C2] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                            <span className="text-sm text-gray-700">{preview.name}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeVideoNuevo(index)}
                                                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                        >
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            Categorías
                                        </label>
                                        <div className="border-2 border-gray-200 rounded-xl p-4 max-h-48 overflow-y-auto">
                                            {categorias.map((categoria) => (
                                                <div key={categoria.id} className="flex items-center mb-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`categoria-${categoria.id}`}
                                                        checked={data.categorias.includes(categoria.id)}
                                                        onChange={() => toggleCategoria(categoria.id)}
                                                        className="h-4 w-4 rounded border-gray-300 text-[#40B0C2] focus:ring-[#40B0C2]"
                                                    />
                                                    <label htmlFor={`categoria-${categoria.id}`} className="ml-2 block text-sm text-gray-700">
                                                        {categoria.nombre}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                        {errors.categorias && (
                                            <div className="mt-2 flex items-center text-sm text-red-600">
                                                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                {errors.categorias}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            Subcategorías
                                        </label>
                                        <div className="border-2 border-gray-200 rounded-xl p-4 max-h-48 overflow-y-auto">
                                            {subcategorias.map((subcategoria) => (
                                                <div key={subcategoria.id} className="flex items-center mb-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`subcategoria-${subcategoria.id}`}
                                                        checked={data.subcategorias.includes(subcategoria.id)}
                                                        onChange={() => toggleSubcategoria(subcategoria.id)}
                                                        className="h-4 w-4 rounded border-gray-300 text-[#40B0C2] focus:ring-[#40B0C2]"
                                                    />
                                                    <label htmlFor={`subcategoria-${subcategoria.id}`} className="ml-2 block text-sm text-gray-700">
                                                        {subcategoria.nombre}
                                                        {subcategoria.categoria && (
                                                            <span className="text-xs text-gray-400 ml-1">({subcategoria.categoria.nombre})</span>
                                                        )}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                        {errors.subcategorias && (
                                            <div className="mt-2 flex items-center text-sm text-red-600">
                                                <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                {errors.subcategorias}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100">
                                    <Link
                                        href={route('productos.index')}
                                        className="inline-flex items-center px-6 py-3 bg-white border-2 border-gray-300 rounded-xl font-semibold text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all shadow-sm"
                                    >
                                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Cancelar
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] border border-transparent rounded-xl font-semibold text-sm text-white hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                                    >
                                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {processing ? 'Guardando...' : 'Actualizar Producto'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
