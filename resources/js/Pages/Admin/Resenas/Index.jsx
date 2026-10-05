import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import { StarRating } from '@/Components/Landing/ReviewsSection';
import { tiempoRelativo } from '@/lib/tiempoRelativo';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { MessageSquareQuote, Pencil, Trash2 } from 'lucide-react';

const formatearFecha = (fecha) => {
    const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');
    return `${dia}/${mes}/${anio}`;
};

export default function Index({ resenas }) {
    const { auth, flash } = usePage().props;
    // Eliminar es solo del admin: acá solo se oculta el botón; el servidor lo impone igual (role:admin).
    const esAdmin = auth.user.role === 'admin';
    const [resenaAEliminar, setResenaAEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    const visibles = resenas.filter((r) => r.is_active).length;

    const toggleActive = (resena) => {
        router.patch(route('resenas.toggle-active', resena.id), {}, { preserveScroll: true });
    };

    const eliminar = () => {
        if (!resenaAEliminar) return;
        router.delete(route('resenas.destroy', resenaAEliminar.id), {
            preserveScroll: true,
            onStart: () => setEliminando(true),
            onFinish: () => {
                setEliminando(false);
                setResenaAEliminar(null);
            },
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col space-y-4 lg:flex-row lg:justify-between lg:items-center lg:space-y-0">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                            Reseñas
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Las reseñas que se muestran en la landing
                            {resenas.length > 0 && ` · ${visibles} de ${resenas.length} visibles`}
                            {!esAdmin && ' · Solo un administrador puede eliminarlas'}
                        </p>
                    </div>
                    <Link
                        href={route('resenas.create')}
                        className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] border border-transparent rounded-xl font-semibold text-sm text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 focus:outline-none focus:ring-2 focus:ring-[#A72DAB] focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
                    >
                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nueva reseña
                    </Link>
                </div>
            }
        >
            <Head title="Reseñas" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="mb-6 mx-4 sm:mx-0 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-6 mx-4 sm:mx-0 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                            {flash.error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-0">
                        {resenas.length === 0 ? (
                            <div className="col-span-full bg-white rounded-2xl shadow-lg p-12 text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#40B0C2]/20 to-[#A72DAB]/20 mb-4">
                                    <MessageSquareQuote className="h-10 w-10 text-gray-400" />
                                </div>
                                <p className="text-gray-600 text-lg mb-2">Todavía no cargaste ninguna reseña</p>
                                <Link
                                    href={route('resenas.create')}
                                    className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
                                >
                                    Cargar la primera reseña
                                </Link>
                            </div>
                        ) : (
                            resenas.map((resena) => (
                                <div
                                    key={resena.id}
                                    className={`bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl ${
                                        resena.is_active ? '' : 'opacity-70'
                                    }`}
                                >
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                                                style={{ backgroundColor: resena.color_avatar || '#1a73e8' }}
                                            >
                                                {resena.iniciales}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-base font-bold text-gray-900 leading-tight truncate">{resena.nombre}</h3>
                                                {resena.meta && <p className="mt-0.5 text-xs text-gray-500 truncate">{resena.meta}</p>}
                                            </div>
                                            <span
                                                className={`inline-flex flex-shrink-0 items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                                    resena.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                                                }`}
                                            >
                                                {resena.is_active ? 'Visible' : 'Oculta'}
                                            </span>
                                        </div>

                                        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <StarRating compact value={resena.puntuacion} />
                                            <span className="text-xs text-gray-500">
                                                {formatearFecha(resena.fecha)} · {tiempoRelativo(resena.fecha)}
                                            </span>
                                        </div>

                                        {resena.texto ? (
                                            <p className="mt-3 text-sm text-gray-700 whitespace-pre-line line-clamp-5 flex-1">{resena.texto}</p>
                                        ) : (
                                            <p className="mt-3 text-sm text-gray-400 italic flex-1">Sin texto, solo estrellas</p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 border-t border-gray-100 px-6 py-3 bg-gray-50">
                                        <button
                                            onClick={() => toggleActive(resena)}
                                            className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-white border-2 border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:border-gray-300 transition-all"
                                            title={resena.is_active ? 'Ocultar de la landing' : 'Mostrar en la landing'}
                                        >
                                            {resena.is_active ? 'Ocultar' : 'Mostrar'}
                                        </button>
                                        <Link
                                            href={route('resenas.edit', resena.id)}
                                            className="inline-flex items-center justify-center h-9 w-9 flex-shrink-0 bg-white border-2 border-[#40B0C2] text-[#40B0C2] rounded-full hover:bg-[#40B0C2] hover:text-white transition-all duration-300 transform hover:scale-105 active:scale-95"
                                            title="Editar"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Link>
                                        {esAdmin && (
                                            <button
                                                onClick={() => setResenaAEliminar(resena)}
                                                className="inline-flex items-center justify-center h-9 w-9 flex-shrink-0 bg-white border-2 border-red-500 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all duration-300 transform hover:scale-105 active:scale-95"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {esAdmin && (
                <Modal show={resenaAEliminar !== null} onClose={eliminando ? () => {} : () => setResenaAEliminar(null)} maxWidth="lg">
                    <div className="p-6">
                        <h3 className="text-lg font-bold text-gray-900">Eliminar reseña</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            ¿Seguro que querés eliminar la reseña de <strong>{resenaAEliminar?.nombre}</strong>? Esta acción no se puede deshacer.
                            Si solo querés que deje de verse en la landing, ocultala.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setResenaAEliminar(null)}
                                disabled={eliminando}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={eliminar}
                                disabled={eliminando}
                                className="px-4 py-2 bg-red-600 rounded-lg text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {eliminando ? 'Eliminando…' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </AuthenticatedLayout>
    );
}
