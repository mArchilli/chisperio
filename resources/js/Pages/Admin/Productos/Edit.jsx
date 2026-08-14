import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import EscalasPrecioRepeater, { validarEscalasPrecio } from '@/Components/EscalasPrecioRepeater';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

export default function Edit({ producto, categorias, subcategorias }) {
    const { data, setData, post, transform, processing, errors } = useForm({
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
        escalas_precio: (producto.escalas_precio || []).map(e => ({
            id: e.id,
            cantidad_minima: e.cantidad_minima,
            precio_unitario: e.precio_unitario,
        })),
    });

    const [imagenesPreview, setImagenesPreview] = useState([]);
    const [videosPreview, setVideosPreview] = useState([]);
    const [mediaExistente, setMediaExistente] = useState(producto.media || []);

    const quillRef = useRef(null);
    const quillInstanceRef = useRef(null);

    useEffect(() => {
        if (quillRef.current && !quillInstanceRef.current) {
            quillInstanceRef.current = new Quill(quillRef.current, {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline'],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        [{ header: [2, 3, false] }],
                        ['link', 'clean'],
                    ],
                },
                placeholder: 'Escribe la descripción del producto...',
            });

            if (producto.descripcion) {
                quillInstanceRef.current.root.innerHTML = producto.descripcion;
            }

            quillInstanceRef.current.on('text-change', () => {
                const html = quillInstanceRef.current.root.innerHTML;
                setData('descripcion', html === '<p><br></p>' ? '' : html);
            });
        }
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();

        const { esValido } = validarEscalasPrecio(data.escalas_precio);
        if (!esValido) {
            return;
        }

        // PHP no parsea el body multipart de una request PUT (solo lo hace para POST),
        // así que con archivos de por medio hay que mandar un POST real y spoofear el
        // método con _method para que Laravel lo enrute como el update del resource.
        transform((data) => ({ ...data, _method: 'put' }));

        post(route('productos.update', producto.id), {
            forceFormData: true,
            preserveState: true,
            preserveScroll: true,
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
                                </div>

                                <EscalasPrecioRepeater
                                    escalas={data.escalas_precio}
                                    onChange={(nuevas) => setData('escalas_precio', nuevas)}
                                    precioBase={data.precio}
                                    errors={errors}
                                />

                                <div className="mb-6">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Descripción
                                    </label>
                                    <div className="rounded-xl overflow-hidden shadow-sm">
                                        <div ref={quillRef} />
                                    </div>
                                    {errors.descripcion && (
                                        <div className="mt-2 flex items-center text-sm text-red-600">
                                            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            {errors.descripcion}
                                        </div>
                                    )}
                                </div>

                                {/* Sección Multimedia Moderna */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                        <svg className="h-5 w-5 mr-2 text-[#40B0C2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Multimedia
                                    </h3>

                                    {/* Zona de Imágenes */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-bold text-gray-700 mb-3">
                                            Imágenes del Producto
                                        </label>
                                        
                                        {/* Imágenes Existentes */}
                                        {mediaExistente.filter(m => m.tipo === 'imagen').length > 0 && (
                                            <div className="mb-4">
                                                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Imágenes Actuales</p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                                                    {mediaExistente.filter(m => m.tipo === 'imagen').map((media) => (
                                                        <div key={media.id} className="relative group">
                                                            <div className="aspect-square rounded-xl overflow-hidden border-3 border-gray-200 shadow-md hover:shadow-xl transition-all">
                                                                <img
                                                                    src={`/${media.ruta}`}
                                                                    alt="Producto"
                                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => eliminarMediaExistente(media.id)}
                                                                className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600 hover:scale-110"
                                                            >
                                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                            {media.is_principal && (
                                                                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 text-xs font-bold rounded-full shadow-lg bg-gradient-to-r from-yellow-400 to-yellow-600 text-white scale-105">
                                                                    ⭐ Principal
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Agregar Nuevas Imágenes */}
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={handleImagenesChange}
                                                id="imageUploadEdit"
                                                className="hidden"
                                            />
                                            <label
                                                htmlFor="imageUploadEdit"
                                                className="flex flex-col items-center justify-center w-full h-48 border-3 border-dashed border-[#40B0C2]/40 rounded-2xl cursor-pointer bg-gradient-to-br from-[#40B0C2]/5 via-white to-[#A72DAB]/5 hover:from-[#40B0C2]/10 hover:to-[#A72DAB]/10 transition-all group"
                                            >
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <div className="p-4 bg-gradient-to-br from-[#40B0C2] to-[#A72DAB] rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                                                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <p className="mb-2 text-sm font-bold text-gray-700">
                                                        <span className="bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">Haz clic para subir</span> o arrastra las imágenes aquí
                                                    </p>
                                                    <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 5MB</p>
                                                </div>
                                            </label>
                                        </div>
                                        
                                        {imagenesPreview.length > 0 && (
                                            <div className="mt-4">
                                                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Nuevas Imágenes</p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                    {imagenesPreview.map((preview, index) => (
                                                        <div key={index} className="relative group">
                                                            <div className="aspect-square rounded-xl overflow-hidden border-3 border-gray-200 shadow-md hover:shadow-xl transition-all">
                                                                <img
                                                                    src={preview.url}
                                                                    alt={preview.name}
                                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeImagenNueva(index)}
                                                                className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600 hover:scale-110"
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
                                    </div>

                                    {/* Zona de Videos */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-3">
                                            Videos del Producto
                                        </label>
                                        
                                        {/* Videos Existentes */}
                                        {mediaExistente.filter(m => m.tipo === 'video').length > 0 && (
                                            <div className="mb-4">
                                                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Videos Actuales</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                                    {mediaExistente.filter(m => m.tipo === 'video').map((media) => (
                                                        <div key={media.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-[#A72DAB]/10 to-[#40B0C2]/10 rounded-xl border-2 border-[#A72DAB]/30 group hover:shadow-lg transition-all">
                                                            <div className="flex items-center flex-1">
                                                                <div className="flex-shrink-0 p-3 bg-gradient-to-br from-[#A72DAB] to-[#40B0C2] rounded-lg">
                                                                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                </div>
                                                                <span className="ml-3 text-sm font-medium text-gray-700 truncate">{media.ruta.split('/').pop()}</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => eliminarMediaExistente(media.id)}
                                                                className="ml-3 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all hover:scale-110"
                                                            >
                                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Agregar Nuevos Videos */}
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="video/*"
                                                multiple
                                                onChange={handleVideosChange}
                                                id="videoUploadEdit"
                                                className="hidden"
                                            />
                                            <label
                                                htmlFor="videoUploadEdit"
                                                className="flex flex-col items-center justify-center w-full h-40 border-3 border-dashed border-[#A72DAB]/40 rounded-2xl cursor-pointer bg-gradient-to-br from-[#A72DAB]/5 via-white to-[#40B0C2]/5 hover:from-[#A72DAB]/10 hover:to-[#40B0C2]/10 transition-all group"
                                            >
                                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                    <div className="p-4 bg-gradient-to-br from-[#A72DAB] to-[#40B0C2] rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                                                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <p className="mb-2 text-sm font-bold text-gray-700">
                                                        <span className="bg-gradient-to-r from-[#A72DAB] to-[#40B0C2] bg-clip-text text-transparent">Haz clic para subir</span> o arrastra videos aquí
                                                    </p>
                                                    <p className="text-xs text-gray-500">MP4, MOV, AVI hasta 50MB</p>
                                                </div>
                                            </label>
                                        </div>
                                        
                                        {videosPreview.length > 0 && (
                                            <div className="mt-4">
                                                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Nuevos Videos</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {videosPreview.map((preview, index) => (
                                                        <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-[#A72DAB]/10 to-[#40B0C2]/10 rounded-xl border-2 border-[#A72DAB]/30 group hover:shadow-lg transition-all">
                                                            <div className="flex items-center flex-1">
                                                                <div className="flex-shrink-0 p-3 bg-gradient-to-br from-[#A72DAB] to-[#40B0C2] rounded-lg">
                                                                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                </div>
                                                                <span className="ml-3 text-sm font-medium text-gray-700 truncate">{preview.name}</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeVideoNuevo(index)}
                                                                className="ml-3 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all hover:scale-110"
                                                            >
                                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Categorías y Subcategorías */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                        <svg className="h-5 w-5 mr-2 text-[#40B0C2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                        Categorización
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        {/* Categorías */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-3">
                                                Categorías <span className="text-gray-400 font-normal">(Selecciona una o más)</span>
                                            </label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {categorias.map((categoria) => (
                                                    <button
                                                        key={categoria.id}
                                                        type="button"
                                                        onClick={() => toggleCategoria(categoria.id)}
                                                        className={`relative p-4 rounded-xl border-2 text-left transition-all transform hover:scale-105 ${
                                                            data.categorias.includes(categoria.id)
                                                                ? 'border-[#40B0C2] bg-gradient-to-br from-[#40B0C2]/10 to-[#40B0C2]/5 shadow-lg shadow-[#40B0C2]/20'
                                                                : 'border-gray-200 bg-white hover:border-[#40B0C2]/50'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <p className={`font-semibold text-sm ${
                                                                    data.categorias.includes(categoria.id) ? 'text-[#40B0C2]' : 'text-gray-700'
                                                                }`}>
                                                                    {categoria.nombre}
                                                                </p>
                                                            </div>
                                                            {data.categorias.includes(categoria.id) && (
                                                                <div className="flex-shrink-0 ml-2">
                                                                    <div className="h-6 w-6 rounded-full bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] flex items-center justify-center">
                                                                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </button>
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

                                        {/* Subcategorías - Solo mostrar las de las categorías seleccionadas */}
                                        {data.categorias.length > 0 && (
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-3">
                                                    Subcategorías <span className="text-gray-400 font-normal">(Basadas en categorías seleccionadas)</span>
                                                </label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                                    {subcategorias
                                                        .filter(sub => data.categorias.includes(sub.categoria?.id))
                                                        .map((subcategoria) => (
                                                            <button
                                                                key={subcategoria.id}
                                                                type="button"
                                                                onClick={() => toggleSubcategoria(subcategoria.id)}
                                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                                    data.subcategorias.includes(subcategoria.id)
                                                                        ? 'bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] text-white shadow-md'
                                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                                                                }`}
                                                            >
                                                                {subcategoria.nombre}
                                                            </button>
                                                        ))
                                                    }
                                                </div>
                                                {data.categorias.length > 0 && subcategorias.filter(sub => data.categorias.includes(sub.categoria?.id)).length === 0 && (
                                                    <p className="text-sm text-gray-500 italic mt-2">No hay subcategorías para las categorías seleccionadas</p>
                                                )}
                                                {errors.subcategorias && (
                                                    <div className="mt-2 flex items-center text-sm text-red-600">
                                                        <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                        {errors.subcategorias}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Configuración de Visibilidad */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                        <svg className="h-5 w-5 mr-2 text-[#40B0C2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                        </svg>
                                        Configuración del Producto
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Toggle Activo */}
                                        <div className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-[#40B0C2] transition-all">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                                                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <label htmlFor="is_active_edit" className="ml-3 block text-sm font-bold text-gray-700 cursor-pointer">
                                                    Producto Visible
                                                    <span className="block text-xs text-gray-500 font-normal">Mostrar en el catálogo</span>
                                                </label>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    id="is_active_edit"
                                                    checked={data.is_active}
                                                    onChange={(e) => setData('is_active', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#40B0C2]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-green-400 peer-checked:to-green-600"></div>
                                            </label>
                                        </div>

                                        {/* Toggle Destacado */}
                                        <div className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-yellow-500 transition-all">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                                                    <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                </div>
                                                <label htmlFor="is_featured_edit" className="ml-3 block text-sm font-bold text-gray-700 cursor-pointer">
                                                    Producto Destacado
                                                    <span className="block text-xs text-gray-500 font-normal">Aparecerá primero</span>
                                                </label>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    id="is_featured_edit"
                                                    checked={data.is_featured}
                                                    onChange={(e) => setData('is_featured', e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-yellow-400 peer-checked:to-yellow-600"></div>
                                            </label>
                                        </div>
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
