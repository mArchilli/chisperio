import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';

/**
 * Página de error renderizada por el handler de excepciones (ver
 * `bootstrap/app.php`). Reemplaza el error crudo de Laravel/Symfony —que Inertia
 * además muestra como un modal con el HTML embebido— por una pantalla propia.
 * El caso más común: un vendedor que hace clic en una card/acceso del panel que
 * es solo para admin (`role:admin`) → 403.
 */
const COPY = {
    403: {
        titulo: 'No tenés permisos',
        descripcion: 'Tu cuenta no tiene acceso a esta sección del panel. Si creés que es un error, avisale a un administrador.',
    },
    404: {
        titulo: 'No encontramos esta página',
        descripcion: 'El enlace puede estar roto o la página ya no existe.',
    },
    419: {
        titulo: 'Tu sesión expiró',
        descripcion: 'Por seguridad cerramos la sesión. Iniciá sesión de nuevo para continuar.',
    },
    500: {
        titulo: 'Algo salió mal',
        descripcion: 'Tuvimos un problema inesperado. Probá de nuevo en unos minutos.',
    },
    503: {
        titulo: 'Estamos en mantenimiento',
        descripcion: 'El panel vuelve a estar disponible en unos minutos.',
    },
};

function CandadoIcon() {
    return (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 0h10.5a2.25 2.25 0 012.25 2.25v6.75a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25v-6.75a2.25 2.25 0 012.25-2.25z" />
        </svg>
    );
}

const btnPrimario =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition-all hover:shadow-xl hover:shadow-purple-500/40 focus:outline-none focus:ring-2 focus:ring-[#A72DAB] focus:ring-offset-2';
const btnSecundario =
    'inline-flex items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2';

function Contenido({ status, message }) {
    const { auth } = usePage().props;
    const copy = COPY[status] ?? { titulo: `Error ${status}`, descripcion: 'Ocurrió un problema inesperado.' };

    return (
        <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
            <div className="w-full max-w-md text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#40B0C2] to-[#A72DAB] text-white shadow-lg">
                    <CandadoIcon />
                </div>

                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#A72DAB]">Error {status}</p>
                <h1 className="mt-2 text-2xl font-bold text-gray-900">{copy.titulo}</h1>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">{copy.descripcion}</p>

                {message && (
                    <p className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-medium text-gray-600">
                        {message}
                    </p>
                )}

                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    {auth?.user ? (
                        <>
                            <Link href={route('dashboard')} className={btnPrimario}>
                                Volver al panel
                            </Link>
                            <a href="/" className={btnSecundario}>
                                Ir al sitio
                            </a>
                        </>
                    ) : (
                        <a href="/" className={btnPrimario}>
                            Ir al inicio
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function Error({ status, message = null }) {
    const { auth } = usePage().props;
    const titulo = (COPY[status] ?? { titulo: `Error ${status}` }).titulo;

    if (auth?.user) {
        return (
            <AuthenticatedLayout
                header={
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                            {titulo}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">Error {status}</p>
                    </div>
                }
            >
                <Head title={titulo} />
                <Contenido status={status} message={message} />
            </AuthenticatedLayout>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <Head title={titulo} />
            <Contenido status={status} message={message} />
        </div>
    );
}
