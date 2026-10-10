import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ResenaForm from '@/Components/ResenaForm';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Edit({ resena, colores }) {
    const { data, setData, put, processing, errors } = useForm({
        nombre: resena.nombre ?? '',
        meta: resena.meta ?? '',
        texto: resena.texto ?? '',
        puntuacion: resena.puntuacion ?? 5,
        fecha: resena.fecha ?? '',
        color_avatar: resena.color_avatar ?? colores[0],
        is_active: resena.is_active,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('resenas.update', resena.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-[#6000ca]">
                        Editar Reseña
                    </h2>
                    <Link
                        href={route('resenas.index')}
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
            <Head title="Editar Reseña" />

            <div className="py-8">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <ResenaForm
                        data={data}
                        setData={setData}
                        errors={errors}
                        processing={processing}
                        onSubmit={handleSubmit}
                        submitLabel="Guardar cambios"
                        colores={colores}
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
