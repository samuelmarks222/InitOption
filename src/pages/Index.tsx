import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import TradingPlatform from "@/components/landing/TradingPlatform";
import Footer from "@/components/landing/Footer";
import { useWebsiteContent } from "@/hooks/useWebsiteContent";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: websiteContent } = useWebsiteContent();

  // Redirect to trade room if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate("/trade", { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#09131d] font-copy">
      <Header />
      <Hero content={websiteContent} />
      <Features content={websiteContent} />
      <TradingPlatform content={websiteContent} />
      <Footer content={websiteContent} />
    </div>
  );
};

export default Index;
