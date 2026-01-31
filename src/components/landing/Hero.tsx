import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Star, TrendingUp } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background gradient */}
      <div className="absolute inset-0 gradient-dark" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Live ticker */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border mb-8 animate-slide-up">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-primary" />
            </div>
            <span className="text-muted-foreground">BTC/USD (OTC)</span>
            <span className="text-trading-green font-medium">1.68% ↗</span>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <span className="text-foreground">12 years of launching</span>
            <br />
            <span className="text-muted-foreground">trading careers</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground mb-8 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            Join IQ Option — the first-choice broker for{" "}
            <span className="text-foreground font-semibold">174 207 579</span>{" "}
            traders across 180 countries.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Link to="/register">
              <Button variant="trading" size="xl">
                Create an account
              </Button>
            </Link>
            <Link to="/trade">
              <Button variant="tradingOutline" size="xl">
                Try free demo
              </Button>
            </Link>
          </div>

          {/* Trustpilot */}
          <div className="flex items-center justify-center gap-2 text-muted-foreground animate-slide-up" style={{ animationDelay: "0.4s" }}>
            <Star className="w-5 h-5 text-trading-green fill-trading-green" />
            <span className="font-medium">4.3</span>
            <Star className="w-4 h-4 text-trading-green fill-trading-green" />
            <span>on Trustpilot</span>
          </div>
        </div>

        {/* Hero Image - Racing car silhouette effect */}
        <div className="relative mt-16 animate-slide-up" style={{ animationDelay: "0.5s" }}>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
          <div className="relative h-64 md:h-96 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full max-w-4xl h-full relative">
                {/* Abstract racing car shape */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3/4 h-1/2 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 rounded-full blur-2xl" />
                </div>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 h-24 bg-gradient-to-r from-transparent via-primary/30 to-transparent blur-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
