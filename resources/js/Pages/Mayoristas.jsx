import { Head } from '@inertiajs/react';
import LandingFooter from '@/Components/Landing/LandingFooter';
import LandingHeader from '@/Components/Landing/LandingHeader';
import WholesalerSection from '@/Components/Landing/WholesalerSection';

export default function Mayoristas({ canLogin }) {
    return (
        <div className="flex min-h-screen flex-col bg-[#fcf9f8] text-[#1c1b1b] antialiased">
            <Head title="Compras mayoristas" />
            <LandingHeader canLogin={canLogin} />

            <main className="flex-1">
                <WholesalerSection />
            </main>

            <LandingFooter canLogin={canLogin} />
        </div>
    );
}
