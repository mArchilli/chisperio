import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ComboProductosRepeater, { validarComboItems, limpiarComboItemsParaEnviar } from '@/Components/ComboProductosRepeater';
import DescuentoSimpleFields, { validarDescuentoSimple } from '@/Components/DescuentoSimpleFields';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Edit({ combo, productosDisponibles }) {
    const { data, setData, post, transform, processing, errors } = useForm({
        titulo: combo.titulo || '',
        descripcion: combo.descripcion || '',
        precio: combo.precio || '',
        is_active: combo.is_active ?? true,
        is_featured: combo.is_featured ?? false,
        envio_gratis: combo.envio_gratis ?? false,
        imagenes: [],
        videos: [],
        imagen_principal: null,
        media_eliminar: [],
        items: (combo.items || []).map((item) => ({
            id: item.id,
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            producto_variante_id: item.producto_variante_id ?? '',
        })),
        descuento_activo: combo.descuento_activo ?? false,
        tipo_descuento: combo.tipo_descuento || 'porcentaje',
        valor_descuento: combo.valor_descuento ?? '',
        descuento_fecha_inicio: combo.descuento_fecha_inicio ? combo.descuento_fecha_inicio.substring(0, 16) : '',
        descuento_fecha_fin: combo.descuento_fecha_fin ? combo.descuento_fecha_fin.substring(0, 16) : '',
    });

    const [imagenesPreview, setImagenesPreview] = useState([]);
    const [videosPreview, setVideosPreview] = useState([]);
    const [mediaExistente, setMediaExistente] = useState(combo.media || []);

    const handleSubmit = (e) => {
        e.preventDefault();

        const { esValido: itemsValidos } = validarComboItems(data.items);
        const { esValido: descuentoValido } = validarDescuentoSimple(data);
        if (!itemsValidos || !descuentoValido) return;

        transform((data) => ({
            ...data,
            _method: 'put',
            items: limpiarComboItemsParaEnviar(data.items),
        }));

        post(route('combos.update', combo.id), {
            forceFormData: true,
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleImagenesChange = (e) => {
        const files = Array.from(e.target.files);
        setData('imagenes', [...data.imagenes, ...files]);
        setImagenesPreview([...imagenesPreview, ...files.map((file) => ({ file, url: URL.createObjectURL(file), name: file.name }))]);
    };

    const handleVideosChange = (e) => {
        const files = Array.from(e.target.files);
        setData('videos', [...data.videos, ...files]);
        setVideosPreview([...videosPreview, ...files.map((file) => ({ file, url: URL.createObjectURL(file), name: file.name }))]);
    };

    const removeImagen = (index) => {
        setData('imagenes', data.imagenes.filter((_, i) => i !== index));
        setImagenesPreview(imagenesPreview.filter((_, i) => i !== index));
        if (data.imagen_principal === index) setData('imagen_principal', null);
    };

    const removeVideo = (index) => {
        setData('videos', data.videos.filter((_, i) => i !== index));
        setVideosPreview(videosPreview.filter((_, i) => i !== index));
    };

    const eliminarMediaExistente = (mediaId) => {
        setMediaExistente(mediaExistente.filter((m) => m.id !== mediaId));
        setData('media_eliminar', [...data.media_eliminar, mediaId]);
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                        Editar Combo
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">{combo.titulo}</p>
                </div>
            }
        >
            <Head title="Editar Combo" />

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
                                        {errors.titulo && <p className="mt-2 text-sm text-red-600">{errors.titulo}</p>}
                                    </div>

                                    <div className="md:col-span-2">
                                        <label htmlFor="descripcion" className="block text-sm font-bold text-gray-700 mb-2">
                                            Descripción
                                        </label>
                                        <textarea
                                            id="descripcion"
                                            rows={4}
                                            value={data.descripcion}
                                            onChange={(e) => setData('descripcion', e.target.value)}
                                            className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50 transition-all"
                                        />
                                        {errors.descripcion && <p className="mt-2 text-sm text-red-600">{errors.descripcion}</p>}
                                    </div>

                                    <div>
                                        <label htmlFor="precio" className="block text-sm font-bold text-gray-700 mb-2">
                                            Precio del combo <span className="text-[#A72DAB]">*</span>
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
                                        {errors.precio && <p className="mt-2 text-sm text-red-600">{errors.precio}</p>}
                                    </div>
                                </div>

                                <ComboProductosRepeater
                                    items={data.items}
                                    onChange={(nuevos) => setData('items', nuevos)}
                                    errors={errors}
                                    productosDisponibles={productosDisponibles}
                                />

                                <DescuentoSimpleFields data={data} setData={setData} errors={errors} />

                                <div className="mb-8">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4">Multimedia</h3>

                                    <div className="mb-6">
                                        <label className="block text-sm font-bold text-gray-700 mb-3">Imágenes del combo</label>

                                        {mediaExistente.filter((m) => m.tipo === 'imagen').length > 0 && (
                                            <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                {mediaExistente.filter((m) => m.tipo === 'imagen').map((media) => (
                                                    <div key={media.id} className="group relative">
                                                        <div className="aspect-square rounded-xl overflow-hidden border-3 border-gray-200 shadow-md">
                                                            <img src={`/${media.ruta}`} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                        <button type="button" onClick={() => eliminarMediaExistente(media.id)} className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600">
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                        {media.is_principal && (
                                                            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">⭐ Principal</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="relative">
                                            <input type="file" accept="image/*" multiple onChange={handleImagenesChange} id="imageUpload" className="hidden" />
                                            <label htmlFor="imageUpload" className="flex flex-col items-center justify-center w-full h-32 border-3 border-dashed border-[#40B0C2]/40 rounded-2xl cursor-pointer bg-gradient-to-br from-[#40B0C2]/5 via-white to-[#A72DAB]/5 hover:from-[#40B0C2]/10 hover:to-[#A72DAB]/10 transition-all">
                                                <p className="text-sm font-bold text-gray-700">Agregar más imágenes</p>
                                                <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 5MB</p>
                                            </label>
                                        </div>

                                        {imagenesPreview.length > 0 && (
                                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                {imagenesPreview.map((preview, index) => (
                                                    <div key={index} className="group relative">
                                                        <div className="aspect-square rounded-xl overflow-hidden border-3 border-gray-200 shadow-md">
                                                            <img src={preview.url} alt={preview.name} className="w-full h-full object-cover" />
                                                        </div>
                                                        <button type="button" onClick={() => removeImagen(index)} className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600">
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setData('imagen_principal', index)}
                                                            className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 text-xs font-bold rounded-full shadow-lg transition-all ${
                                                                data.imagen_principal === index ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white' : 'bg-white text-gray-700'
                                                            }`}
                                                        >
                                                            {data.imagen_principal === index ? '⭐ Principal' : 'Principal'}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-3">Videos del combo</label>

                                        {mediaExistente.filter((m) => m.tipo === 'video').length > 0 && (
                                            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {mediaExistente.filter((m) => m.tipo === 'video').map((media) => (
                                                    <div key={media.id} className="p-4 bg-gradient-to-r from-[#A72DAB]/10 to-[#40B0C2]/10 rounded-xl border-2 border-[#A72DAB]/30 flex items-center justify-between">
                                                        <span className="text-sm font-medium text-gray-700 truncate">{media.ruta.split('/').pop()}</span>
                                                        <button type="button" onClick={() => eliminarMediaExistente(media.id)} className="ml-3 p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="relative">
                                            <input type="file" accept="video/*" multiple onChange={handleVideosChange} id="videoUpload" className="hidden" />
                                            <label htmlFor="videoUpload" className="flex flex-col items-center justify-center w-full h-28 border-3 border-dashed border-[#A72DAB]/40 rounded-2xl cursor-pointer bg-gradient-to-br from-[#A72DAB]/5 via-white to-[#40B0C2]/5 hover:from-[#A72DAB]/10 hover:to-[#40B0C2]/10 transition-all">
                                                <p className="text-sm font-bold text-gray-700">Agregar más videos</p>
                                                <p className="text-xs text-gray-500">MP4, MOV, AVI hasta 50MB</p>
                                            </label>
                                        </div>

                                        {videosPreview.length > 0 && (
                                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {videosPreview.map((preview, index) => (
                                                    <div key={index} className="p-4 bg-gradient-to-r from-[#A72DAB]/10 to-[#40B0C2]/10 rounded-xl border-2 border-[#A72DAB]/30 flex items-center justify-between">
                                                        <span className="text-sm font-medium text-gray-700 truncate">{preview.name}</span>
                                                        <button type="button" onClick={() => removeVideo(index)} className="ml-3 p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-xl">
                                        <label htmlFor="is_active" className="text-sm font-bold text-gray-700 cursor-pointer">
                                            Combo visible
                                            <span className="block text-xs text-gray-500 font-normal">Mostrar en la tienda</span>
                                        </label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" id="is_active" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} className="sr-only peer" />
                                            <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#40B0C2]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-green-400 peer-checked:to-green-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-xl">
                                        <label htmlFor="is_featured" className="text-sm font-bold text-gray-700 cursor-pointer">
                                            Combo destacado
                                            <span className="block text-xs text-gray-500 font-normal">Aparecerá primero</span>
                                        </label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" id="is_featured" checked={data.is_featured} onChange={(e) => setData('is_featured', e.target.checked)} className="sr-only peer" />
                                            <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-yellow-400 peer-checked:to-yellow-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-xl md:col-span-2">
                                        <label htmlFor="envio_gratis" className="text-sm font-bold text-gray-700 cursor-pointer">
                                            Envío gratis
                                            <span className="block text-xs text-gray-500 font-normal">Este combo incluye envío gratis, independientemente del monto del pedido</span>
                                        </label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" id="envio_gratis" checked={data.envio_gratis} onChange={(e) => setData('envio_gratis', e.target.checked)} className="sr-only peer" />
                                            <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#40B0C2]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#40B0C2] peer-checked:to-[#2f8a99]"></div>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-100">
                                    <Link
                                        href={route('combos.index')}
                                        className="inline-flex items-center px-6 py-3 bg-white border-2 border-gray-300 rounded-xl font-semibold text-sm text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                                    >
                                        Cancelar
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] border border-transparent rounded-xl font-semibold text-sm text-white hover:shadow-lg disabled:opacity-50 transition-all shadow-md"
                                    >
                                        {processing ? 'Guardando...' : 'Guardar Cambios'}
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
