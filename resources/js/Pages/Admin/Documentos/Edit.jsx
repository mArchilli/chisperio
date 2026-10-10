import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FileText, Link2 } from 'lucide-react';

export default function Edit({ documento }) {
    const { data, setData, post, transform, processing, errors } = useForm({
        titulo: documento.titulo || '',
        descripcion: documento.descripcion || '',
        tipo: documento.tipo,
        url: documento.url || '',
        archivo: null,
        orden: documento.orden ?? 0,
        is_active: documento.is_active,
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        // PHP no parsea el body multipart de una request PUT (solo lo hace para POST),
        // así que con un archivo de por medio hay que mandar un POST real y spoofear
        // el método con _method para que Laravel lo enrute como el update del resource.
        transform((data) => ({
            ...data,
            _method: 'put',
        }));

        post(route('documentos.update', documento.id), {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-[#6000ca]">
                        Editar Documento
                    </h2>
                    <Link
                        href={route('documentos.index')}
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
            <Head title="Editar Documento" />

            <div className="py-8">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <div className="admin-card bg-white rounded-2xl shadow-xl overflow-hidden">
                        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
                            {/* Título */}
                            <div className="mb-6">
                                <label htmlFor="titulo" className="block text-sm font-bold text-gray-900 mb-2">
                                    Título *
                                </label>
                                <input
                                    type="text"
                                    id="titulo"
                                    value={data.titulo}
                                    onChange={(e) => setData('titulo', e.target.value)}
                                    className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6000ca] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02]"
                                />
                                {errors.titulo && <p className="mt-2 text-sm text-red-600">{errors.titulo}</p>}
                            </div>

                            {/* Descripción breve */}
                            <div className="mb-6">
                                <label htmlFor="descripcion" className="block text-sm font-bold text-gray-900 mb-2">
                                    Descripción breve <span className="text-gray-500 font-normal">(Opcional)</span>
                                </label>
                                <textarea
                                    id="descripcion"
                                    rows={2}
                                    maxLength={500}
                                    value={data.descripcion}
                                    onChange={(e) => setData('descripcion', e.target.value)}
                                    className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6000ca] focus:border-transparent transition-all duration-300 hover:border-gray-300"
                                />
                                {errors.descripcion && <p className="mt-2 text-sm text-red-600">{errors.descripcion}</p>}
                            </div>

                            {/* Tipo */}
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-900 mb-3">Tipo de documento *</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setData('tipo', 'link')}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all duration-200 ${
                                            data.tipo === 'link'
                                                ? 'border-[#6000ca] bg-[#6000ca]/10'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <Link2 className="h-5 w-5 text-[#6000ca] flex-shrink-0" />
                                        <span>
                                            <span className="block text-sm font-semibold text-gray-900">Link (Drive u otro)</span>
                                            <span className="block text-xs text-gray-500">Pegás una URL externa</span>
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setData('tipo', 'pdf')}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all duration-200 ${
                                            data.tipo === 'pdf'
                                                ? 'border-[#6000ca] bg-[#6000ca]/10'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <FileText className="h-5 w-5 text-[#6000ca] flex-shrink-0" />
                                        <span>
                                            <span className="block text-sm font-semibold text-gray-900">Archivo PDF</span>
                                            <span className="block text-xs text-gray-500">Subís el archivo (hasta 20MB)</span>
                                        </span>
                                    </button>
                                </div>
                                {errors.tipo && <p className="mt-2 text-sm text-red-600">{errors.tipo}</p>}
                            </div>

                            {/* Campo condicional: URL o archivo */}
                            {data.tipo === 'link' ? (
                                <div className="mb-6">
                                    <label htmlFor="url" className="block text-sm font-bold text-gray-900 mb-2">
                                        Link *
                                    </label>
                                    <input
                                        type="url"
                                        id="url"
                                        value={data.url}
                                        onChange={(e) => setData('url', e.target.value)}
                                        placeholder="https://drive.google.com/..."
                                        className="block w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6000ca] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02]"
                                    />
                                    {errors.url && <p className="mt-2 text-sm text-red-600">{errors.url}</p>}
                                </div>
                            ) : (
                                <div className="mb-6">
                                    <label htmlFor="archivo" className="block text-sm font-bold text-gray-900 mb-2">
                                        Archivo PDF
                                    </label>
                                    {documento.tipo === 'pdf' && documento.ruta && (
                                        <p className="mb-2 text-sm text-gray-600">
                                            Archivo actual:{' '}
                                            <a
                                                href={`/${documento.ruta}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-semibold text-[#6000ca] hover:underline"
                                            >
                                                verlo
                                            </a>
                                            . Subí uno nuevo solo si querés reemplazarlo.
                                        </p>
                                    )}
                                    <input
                                        type="file"
                                        id="archivo"
                                        accept="application/pdf"
                                        onChange={(e) => setData('archivo', e.target.files[0] ?? null)}
                                        className="block w-full text-sm text-gray-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#6000ca] file:text-white hover:file:shadow-md file:transition-all file:cursor-pointer border-2 border-gray-200 rounded-xl px-2 py-2"
                                    />
                                    {errors.archivo && <p className="mt-2 text-sm text-red-600">{errors.archivo}</p>}
                                </div>
                            )}

                            {/* Orden */}
                            <div className="mb-6">
                                <label htmlFor="orden" className="block text-sm font-bold text-gray-900 mb-2">
                                    Orden de aparición <span className="text-gray-500 font-normal">(Opcional, menor va primero)</span>
                                </label>
                                <input
                                    type="number"
                                    id="orden"
                                    min="0"
                                    step="1"
                                    value={data.orden}
                                    onChange={(e) => setData('orden', e.target.value)}
                                    className="block w-full max-w-xs px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6000ca] focus:border-transparent transition-all duration-300 hover:border-gray-300 focus:scale-[1.02]"
                                />
                                {errors.orden && <p className="mt-2 text-sm text-red-600">{errors.orden}</p>}
                            </div>

                            {/* Estado Activo */}
                            <div className="mb-8">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={data.is_active}
                                        onChange={(e) => setData('is_active', e.target.checked)}
                                        className="w-5 h-5 text-[#6000ca] border-2 border-gray-300 rounded focus:ring-2 focus:ring-[#6000ca] transition-all"
                                    />
                                    <span className="ml-3 text-sm font-semibold text-gray-900">Visible para vendedores</span>
                                </label>
                                <p className="ml-8 mt-1 text-xs text-gray-500">
                                    Si está desactivado, solo lo vas a ver vos en este panel
                                </p>
                            </div>

                            {/* Botones */}
                            <div className="flex flex-col sm:flex-row gap-3 justify-end pt-6 border-t border-gray-200">
                                <Link
                                    href={route('documentos.index')}
                                    className="inline-flex items-center justify-center px-6 py-3 bg-white border-2 border-gray-300 rounded-xl font-semibold text-sm text-gray-700 hover:bg-gray-50 transition-all duration-300 transform hover:scale-105"
                                >
                                    Cancelar
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center justify-center px-6 py-3 bg-[#6000ca] border border-transparent rounded-xl font-semibold text-sm text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
