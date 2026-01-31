import { Award, Zap, Shield, Smartphone } from "lucide-react";

const features = [
  {
    icon: Award,
    title: "Best Trading Experience",
    subtitle: "FX Daily info",
    year: "2023",
  },
  {
    icon: Zap,
    title: "Most Innovative Platform",
    subtitle: "World Business Outlook",
    year: "2022",
  },
  {
    icon: Shield,
    title: "Best Trading Platform",
    subtitle: "World Forex Award",
    year: "2024",
  },
  {
    icon: Smartphone,
    title: "Best Mobile Trading App",
    subtitle: "World Forex Award",
    year: "2024",
  },
];

const Features = () => {
  return (
    <section className="py-24 bg-card">
      <div className="container mx-auto px-4">
        {/* Awards Section */}
        <div className="text-center mb-16">
          <p className="text-primary text-sm font-medium uppercase tracking-wider mb-4">
            iq option awards
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 rounded-xl bg-background border border-border hover:border-primary/50 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                {feature.subtitle}
              </p>
              <span className="text-xs text-primary font-medium">{feature.year}</span>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-foreground mb-2">12+</div>
            <p className="text-muted-foreground">Years of experience</p>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-foreground mb-2">174M+</div>
            <p className="text-muted-foreground">Traders worldwide</p>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-foreground mb-2">550+</div>
            <p className="text-muted-foreground">Trading assets</p>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-foreground mb-2">180</div>
            <p className="text-muted-foreground">Countries supported</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
