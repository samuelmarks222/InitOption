import { Suspense, lazy } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthRestorePath } from "@/lib/authRedirect";
import { shouldStartAtLoginOnMobile } from "@/lib/mobileLanding";
import AuthLoadingScreen from "@/components/auth/AuthLoadingScreen";
import Navbar from "@/components/landing/Navbar";
import BonusPopup from "@/components/landing/BonusPopup";
import HeroSection from "@/components/landing/HeroSection";

const WhatWeOfferSection = lazy(() => import("@/components/landing/WhatWeOfferSection"));
const FeaturesSection = lazy(() => import("@/components/landing/FeaturesSection"));
const StepsSection = lazy(() => import("@/components/landing/StepsSection"));
const MobileSection = lazy(() => import("@/components/landing/MobileSection"));
const EarningsSection = lazy(() => import("@/components/landing/EarningsSection"));
const TestimonialsSection = lazy(() => import("@/components/landing/TestimonialsSection"));
const FAQSection = lazy(() => import("@/components/landing/FAQSection"));
const CTASection = lazy(() => import("@/components/landing/CTASection"));
const Footer = lazy(() => import("@/components/landing/Footer"));

const LandingSectionFallback = () => <div className="min-h-[28vh]" aria-hidden="true" />;

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoadingScreen message="Opening Init Option..." />;
  }

  if (user) {
    return <Navigate to={getAuthRestorePath()} replace />;
  }

  if (shouldStartAtLoginOnMobile()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="quotex-glow-home min-h-screen overflow-x-hidden bg-background">
      <BonusPopup />
      <Navbar />
      <HeroSection />
      <Suspense fallback={<LandingSectionFallback />}>
        <WhatWeOfferSection />
        <FeaturesSection />
        <StepsSection />
        <MobileSection />
        <EarningsSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
