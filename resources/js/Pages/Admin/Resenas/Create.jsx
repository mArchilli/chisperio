import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ResenaForm, { hoyISO } from '@/Components/ResenaForm';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Create({ colores }) {
    const { data, setData, post, processing, errors } = useForm({
        nombre: '',
        meta: '',
        texto: '',
        puntuacion: 5,
        fecha: hoyISO(),
        color_avatar: colores[Math.floor(Math.random() * colores.length)],
        is_active: true,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('resenas.store'));
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-[#6000ca]">
                        Nueva Reseña
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
            <Head title="Nueva Reseña" />

            <div className="py-8">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <ResenaForm
                        data={data}
                        setData={setData}
                        errors={errors}
                        processing={processing}
                        onSubmit={handleSubmit}
                        submitLabel="Crear reseña"
                        colores={colores}
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
