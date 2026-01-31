import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, Lightbulb, PlayCircle } from "lucide-react";

const platformFeatures = [
  {
    icon: TrendingUp,
    title: "Live Strategies",
    description: "Copy winning trades from top performers in real-time",
  },
  {
    icon: BarChart3,
    title: "Script Indicators",
    description: "Advanced technical analysis with custom indicators",
  },
  {
    icon: Lightbulb,
    title: "On-Platform Webinars",
    description: "Learn from experts with interactive trading sessions",
  },
  {
    icon: PlayCircle,
    title: "Free Demo Account",
    description: "Practice with $10,000 virtual balance risk-free",
  },
];

const TradingPlatform = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Stay ahead with high-speed trading
            <br />
            <span className="text-muted-foreground">& advanced tech</span>
          </h2>
          <Link to="/trade">
            <Button variant="trading" size="lg">
              Start trading
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {platformFeatures.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Trading preview mockup */}
        <div className="mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
          <div className="rounded-xl overflow-hidden border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-trading-red" />
              <div className="w-3 h-3 rounded-full bg-primary" />
              <div className="w-3 h-3 rounded-full bg-trading-green" />
            </div>
            <div className="aspect-video bg-background rounded-lg flex items-center justify-center relative overflow-hidden">
              {/* Simulated chart */}
              <div className="absolute inset-0 flex items-end justify-around px-4 pb-4">
                {Array.from({ length: 20 }).map((_, i) => {
                  const isGreen = Math.random() > 0.4;
                  const height = 20 + Math.random() * 60;
                  return (
                    <div
                      key={i}
                      className={`w-3 rounded-sm ${isGreen ? 'bg-trading-green' : 'bg-trading-red'}`}
                      style={{ height: `${height}%` }}
                    />
                  );
                })}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
              <Link to="/trade" className="relative z-10">
                <Button variant="trading" size="lg">
                  Open Trading Platform
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TradingPlatform;
