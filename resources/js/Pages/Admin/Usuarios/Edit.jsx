import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import PasswordInput from '@/Components/PasswordInput';
import { Head, Link, useForm } from '@inertiajs/react';
import { WHATSAPP_SUCURSALES } from '@/lib/whatsapp';

export default function Edit({ usuario }) {
    const { data, setData, put, processing, errors } = useForm({
        name: usuario.name || '',
        email: usuario.email || '',
        password: '',
        password_confirmation: '',
        role: usuario.role || 'vendedor',
        sucursal: usuario.sucursal || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        put(route('usuarios.update', usuario.id));
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] bg-clip-text text-transparent">
                        Editar Usuario
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">Modificá los datos y el rol de la cuenta</p>
                </div>
            }
        >
            <Head title={`Editar ${usuario.name}`} />

            <div className="py-8">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-xl sm:rounded-2xl">
                        <div className="p-8">
                            <form onSubmit={handleSubmit}>
                                <div className="mb-6">
                                    <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">
                                        Nombre <span className="text-[#A72DAB]">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50 transition-all"
                                        required
                                    />
                                    <InputError message={errors.name} className="mt-2" />
                                </div>

                                <div className="mb-6">
                                    <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">
                                        Email <span className="text-[#A72DAB]">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50 transition-all"
                                        required
                                    />
                                    <InputError message={errors.email} className="mt-2" />
                                </div>

                                <div className="mb-6">
                                    <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2">
                                        Nueva contraseña <span className="text-gray-400 font-normal">(dejar en blanco para no cambiarla)</span>
                                    </label>
                                    <PasswordInput
                                        id="password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50 transition-all"
                                    />
                                    <InputError message={errors.password} className="mt-2" />
                                </div>

                                <div className="mb-6">
                                    <label htmlFor="password_confirmation" className="block text-sm font-bold text-gray-700 mb-2">
                                        Confirmar nueva contraseña
                                    </label>
                                    <PasswordInput
                                        id="password_confirmation"
                                        value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50 transition-all"
                                    />
                                </div>

                                <div className="mb-6">
                                    <label htmlFor="role" className="block text-sm font-bold text-gray-700 mb-2">
                                        Rol <span className="text-[#A72DAB]">*</span>
                                    </label>
                                    <select
                                        id="role"
                                        value={data.role}
                                        onChange={(e) => setData('role', e.target.value)}
                                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50 transition-all"
                                    >
                                        <option value="vendedor">Vendedor</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                    <InputError message={errors.role} className="mt-2" />
                                </div>

                                {data.role === 'vendedor' && (
                                    <div className="mb-6">
                                        <label htmlFor="sucursal" className="block text-sm font-bold text-gray-700 mb-2">
                                            Sucursal <span className="text-[#A72DAB]">*</span>
                                        </label>
                                        <select
                                            id="sucursal"
                                            value={data.sucursal}
                                            onChange={(e) => setData('sucursal', e.target.value)}
                                            className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-[#A72DAB] focus:ring focus:ring-[#A72DAB] focus:ring-opacity-50 transition-all"
                                        >
                                            <option value="" disabled>Elegí una sucursal</option>
                                            {WHATSAPP_SUCURSALES.map((s) => (
                                                <option key={s.id} value={s.id}>{s.nombre}</option>
                                            ))}
                                        </select>
                                        <p className="mt-1.5 text-xs text-gray-500">
                                            El vendedor solo verá y gestionará los pedidos de esta sucursal.
                                        </p>
                                        <InputError message={errors.sucursal} className="mt-2" />
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                    <Link
                                        href={route('usuarios.index')}
                                        className="inline-flex items-center px-6 py-3 bg-white border-2 border-gray-300 rounded-xl font-semibold text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
                                    >
                                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Cancelar
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#40B0C2] to-[#A72DAB] border border-transparent rounded-xl font-semibold text-sm text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 focus:outline-none focus:ring-2 focus:ring-[#A72DAB] focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
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
