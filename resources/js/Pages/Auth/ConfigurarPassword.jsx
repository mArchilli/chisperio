import InputError from '@/Components/InputError';
import PasswordInput from '@/Components/PasswordInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function ConfigurarPassword() {
    const { data, setData, put, processing, errors, reset } = useForm({
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        put(route('password.configurar.update'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Configurá tu clave" />

            <div className="mb-6 text-center">
                <h1 className="text-2xl font-black tracking-tight text-[#1c1b1b]">
                    Configurá tu clave de vendedor
                </h1>
                <p className="mt-1 text-sm text-[#4b4356]">
                    Es tu primer ingreso. Elegí una clave nueva y privada para tu
                    cuenta — la que te pasaron era temporal.
                </p>
            </div>

            <form onSubmit={submit} className="flex flex-col gap-4">
                <div>
                    <label
                        htmlFor="password"
                        className="block text-sm font-semibold text-[#1c1b1b]"
                    >
                        Nueva clave
                    </label>

                    <PasswordInput
                        id="password"
                        name="password"
                        value={data.password}
                        autoComplete="new-password"
                        autoFocus
                        onChange={(e) => setData('password', e.target.value)}
                        containerClassName="mt-1.5"
                        className="block w-full rounded-xl border-gray-200 bg-gray-50 text-[#1c1b1b] shadow-sm transition-colors focus:border-[#6000ca] focus:bg-white focus:ring-[#6000ca]"
                    />

                    <p className="mt-1 text-xs text-[#4b4356]">Mínimo 8 caracteres.</p>

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div>
                    <label
                        htmlFor="password_confirmation"
                        className="block text-sm font-semibold text-[#1c1b1b]"
                    >
                        Repetí la nueva clave
                    </label>

                    <PasswordInput
                        id="password_confirmation"
                        name="password_confirmation"
                        value={data.password_confirmation}
                        autoComplete="new-password"
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                        containerClassName="mt-1.5"
                        className="block w-full rounded-xl border-gray-200 bg-gray-50 text-[#1c1b1b] shadow-sm transition-colors focus:border-[#6000ca] focus:bg-white focus:ring-[#6000ca]"
                    />

                    <InputError
                        message={errors.password_confirmation}
                        className="mt-2"
                    />
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="mt-2 w-full rounded-full bg-[#FF00D4] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-pink-500/30 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                >
                    Guardar clave
                </button>
            </form>

            <div className="mt-4 text-center">
                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className="text-sm text-[#4b4356] underline-offset-2 hover:underline"
                >
                    Cerrar sesión
                </Link>
            </div>
        </GuestLayout>
    );
}
