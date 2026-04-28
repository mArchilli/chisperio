import { Head } from '@inertiajs/react';
import LandingHeader from '@/Components/Landing/LandingHeader';
import HeroSection from '@/Components/Landing/HeroSection';
import TrustBanner from '@/Components/Landing/TrustBanner';
import CategoriesSection from '@/Components/Landing/CategoriesSection';
import FeaturedProductsSection from '@/Components/Landing/FeaturedProductsSection';
import ReviewsSection from '@/Components/Landing/ReviewsSection';
import LandingFooter from '@/Components/Landing/LandingFooter';

export default function Welcome({ canLogin, canRegister, productosDestacados = [], categorias = [] }) {
    return (
        <div
            className="bg-[#fcf9f8] min-h-screen text-[#1c1b1b] antialiased"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
            <Head title="Chisperío — Efectos Especiales para Eventos" />
            <LandingHeader canLogin={canLogin} canRegister={canRegister} />
            <main>
                <HeroSection />
                <TrustBanner />
                <CategoriesSection categorias={categorias} />
                <FeaturedProductsSection productos={productosDestacados} />
                <ReviewsSection />
            </main>
            <LandingFooter canLogin={canLogin} />
        </div>
    );
}
