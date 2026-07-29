import { Head } from '@inertiajs/react';
import ContactSection from '@/Components/Landing/ContactSection';
import LandingFooter from '@/Components/Landing/LandingFooter';
import LandingHeader from '@/Components/Landing/LandingHeader';

export default function Contacto({ canLogin }) {
    return (
        <div className="flex min-h-screen flex-col bg-[#fcf9f8] text-[#1c1b1b] antialiased">
            <Head title="Contacto — Chisperío" />
            <LandingHeader canLogin={canLogin} />

            <main className="flex-1">
                <ContactSection />
            </main>

            <LandingFooter canLogin={canLogin} />
        </div>
    );
}
