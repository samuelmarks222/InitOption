import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthRestorePath } from "@/lib/authRedirect";
import Navbar from "@/components/landing/Navbar";
import BonusPopup from "@/components/landing/BonusPopup";
import HeroSection from "@/components/landing/HeroSection";
import MarketTicker from "@/components/landing/MarketTicker";
import WhatWeOfferSection from "@/components/landing/WhatWeOfferSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import StepsSection from "@/components/landing/StepsSection";
import MobileSection from "@/components/landing/MobileSection";
import EarningsSection from "@/components/landing/EarningsSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FAQSection from "@/components/landing/FAQSection";
import SeoContentSection from "@/components/landing/SeoContentSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (user) {
    return <Navigate to={getAuthRestorePath()} replace />;
  }

  return (
    <div className="quotex-glow-home min-h-screen overflow-x-hidden bg-background">
      <BonusPopup />
      <Navbar />
      <HeroSection />
      <MarketTicker />
      <WhatWeOfferSection />
      <FeaturesSection />
      <StepsSection />
      <MobileSection />
      <EarningsSection />
      <TestimonialsSection />
      <FAQSection />
      <SeoContentSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
