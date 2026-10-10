import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import InputPesos from '@/Components/InputPesos';
import { Head, useForm } from '@inertiajs/react';

const formatearPesos = (monto) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(Number(monto));

export default function Edit({ configuracion }) {
    const { data, setData, patch, processing, errors } = useForm({
        monto_minimo: configuracion.monto_minimo,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        patch(route('configuracion-envio.update'));
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-2xl font-bold text-[#6000ca]">
                        Envío Gratis
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">Configurá el monto mínimo de compra para envío gratis</p>
                </div>
            }
        >
            <Head title="Configuración de envío gratis" />

            <div className="py-8">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <div className="admin-card overflow-hidden bg-white shadow-xl sm:rounded-2xl">
                        <div className="p-8">
                            <form onSubmit={handleSubmit}>
                                <div className="mb-6">
                                    <label htmlFor="monto_minimo" className="block text-sm font-bold text-gray-700 mb-2">
                                        Monto mínimo para envío gratis <span className="text-[#6000ca]">*</span>
                                    </label>
                                    <p className="mb-2 text-xs text-gray-400">
                                        0 = la barra de envío gratis queda desactivada en el carrito.
                                    </p>
                                    <InputPesos
                                        id="monto_minimo"
                                        value={data.monto_minimo}
                                        onChange={(valor) => setData('monto_minimo', valor)}
                                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#6000ca] focus:ring focus:ring-[#6000ca] focus:ring-opacity-50 transition-all"
                                        required
                                    />
                                    <p className="mt-2 text-xs text-gray-500">
                                        {Number(data.monto_minimo) > 0
                                            ? `Los pedidos desde ${formatearPesos(data.monto_minimo)} tienen envío gratis.`
                                            : 'Envío gratis desactivado.'}
                                    </p>
                                    <InputError message={errors.monto_minimo} className="mt-2" />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex items-center px-6 py-3 bg-[#6000ca] border border-transparent rounded-xl font-semibold text-sm text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 focus:outline-none focus:ring-2 focus:ring-[#6000ca] focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                                    >
                                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Guardar cambios
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
