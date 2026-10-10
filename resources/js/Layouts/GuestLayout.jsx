import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div
            className="flex min-h-screen flex-col items-center justify-center bg-[#6000ca] px-4 py-8 sm:py-10"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
            <div className="flex w-full max-w-md flex-col items-center">
                <Link href="/" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#6000ca]">
                    <img
                        src="/images/logo-chisperio.png"
                        alt="Chisperío"
                        className="h-24 w-auto object-contain sm:h-28"
                    />
                </Link>

                <div className="mt-6 w-full rounded-[2rem] border border-white bg-white px-6 py-8 shadow-2xl shadow-[#32006b]/30 sm:px-8 sm:py-10">
                    {children}
                </div>
            </div>
        </div>
    );
}
