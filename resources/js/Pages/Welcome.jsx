import { Head } from '@inertiajs/react';
import LandingHeader from '@/Components/Landing/LandingHeader';
import HeroSection from '@/Components/Landing/HeroSection';
import TrustBanner from '@/Components/Landing/TrustBanner';
import CategoriesSection from '@/Components/Landing/CategoriesSection';
import OutstandingProducts from '@/Components/Landing/OutstandingProducts';
import RentalMachine from '@/Components/Landing/RentalMachine';
import ReviewsSection from '@/Components/Landing/ReviewsSection';
import FAQSection from '@/Components/Landing/FAQSection';
import LocationSection from '@/Components/Landing/LocationSection';
import LandingFooter from '@/Components/Landing/LandingFooter';

export default function Welcome({ canLogin, productosDestacados = [], categorias = [] }) {
    return (
        <div className="bg-[#fcf9f8] min-h-screen text-[#1c1b1b] antialiased">
            <Head title="Chispas frías, fuegos artificiales y efectos para eventos" />
            <LandingHeader canLogin={canLogin} />
            <main>
                <HeroSection />
                <TrustBanner />
                <CategoriesSection categorias={categorias} />
                <OutstandingProducts productos={productosDestacados} />
                <RentalMachine />
                <ReviewsSection />
                <FAQSection />
                <LocationSection />
            </main>
            <LandingFooter />
        </div>
    );
}
