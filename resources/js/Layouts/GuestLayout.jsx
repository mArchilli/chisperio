import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#1c1b1b] px-4 py-10">
            <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#6000ca] opacity-40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#FF00D4] opacity-30 blur-3xl" />

            <div className="relative z-10 flex flex-col items-center">
                <Link href="/">
                    <img
                        src="/images/logo-chisperio.png"
                        alt="Chisperío"
                        className="h-16 w-auto brightness-0 invert"
                    />
                </Link>

                <div className="mt-8 w-full max-w-md overflow-hidden rounded-[2rem] bg-white px-8 py-10 shadow-2xl shadow-black/40">
                    {children}
                </div>
            </div>
        </div>
    );
}
