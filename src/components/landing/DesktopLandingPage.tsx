import Navbar from "@/components/landing/Navbar";
import BonusPopup from "@/components/landing/BonusPopup";
import HeroSection from "@/components/landing/HeroSection";
import WhatWeOfferSection from "@/components/landing/WhatWeOfferSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import StepsSection from "@/components/landing/StepsSection";
import MobileSection from "@/components/landing/MobileSection";
import EarningsSection from "@/components/landing/EarningsSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FAQSection from "@/components/landing/FAQSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const DesktopLandingPage = () => {
  return (
    <div className="quotex-glow-home min-h-screen overflow-x-hidden bg-background">
      <BonusPopup />
      <Navbar />
      <HeroSection />
      <WhatWeOfferSection />
      <FeaturesSection />
      <StepsSection />
      <MobileSection />
      <EarningsSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default DesktopLandingPage;
