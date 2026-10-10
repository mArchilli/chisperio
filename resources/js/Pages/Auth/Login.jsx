import InputError from '@/Components/InputError';
import PasswordInput from '@/Components/PasswordInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Iniciar sesión" />

            <div className="mb-6 text-center">
                <h1 className="text-2xl font-black tracking-tight text-[#6000ca]">
                    Bienvenido de nuevo
                </h1>
                <p className="mt-1 text-sm text-[#4b4356]">
                    Ingresá tus datos para acceder a tu cuenta
                </p>
            </div>

            {status && (
                <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="flex flex-col gap-4">
                <div>
                    <label
                        htmlFor="email"
                        className="block text-sm font-semibold text-[#1c1b1b]"
                    >
                        Email
                    </label>

                    <input
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        autoComplete="username"
                        autoFocus
                        onChange={(e) => setData('email', e.target.value)}
                        className="mt-1.5 block w-full rounded-xl border-[#6000ca]/20 bg-white px-4 py-3 text-[#1c1b1b] shadow-sm transition-colors focus:border-[#6000ca] focus:ring-[#6000ca]"
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div>
                    <label
                        htmlFor="password"
                        className="block text-sm font-semibold text-[#1c1b1b]"
                    >
                        Contraseña
                    </label>

                    <PasswordInput
                        id="password"
                        name="password"
                        value={data.password}
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                        containerClassName="mt-1.5"
                        className="block w-full rounded-xl border-[#6000ca]/20 bg-white px-4 py-3 text-[#1c1b1b] shadow-sm transition-colors focus:border-[#6000ca] focus:ring-[#6000ca]"
                    />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            name="remember"
                            checked={data.remember}
                            onChange={(e) =>
                                setData('remember', e.target.checked)
                            }
                            className="rounded border-gray-300 text-[#6000ca] shadow-sm focus:ring-[#6000ca]"
                        />
                        <span className="text-sm text-[#4b4356]">
                            Recordarme
                        </span>
                    </label>

                    {canResetPassword && (
                        <Link
                            href={route('password.request')}
                            className="text-sm font-medium text-[#6000ca] underline-offset-2 hover:underline"
                        >
                            ¿Olvidaste tu contraseña?
                        </Link>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="mt-2 w-full rounded-full bg-[#6000ca] px-7 py-3.5 text-sm font-extrabold uppercase tracking-[0.08em] text-white shadow-lg shadow-[#6000ca]/20 transition-all hover:bg-[#4f00a8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6000ca] focus-visible:ring-offset-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Iniciar sesión
                </button>
            </form>
        </GuestLayout>
    );
}
