const fs = require('fs');
const path = require('path');
const root = path.join(process.cwd(), 'src', 'components', 'landing');

const affectedFiles = [
  'AnimatedTradingChart.tsx',
  'BonusPopup.tsx',
  'CTASection.tsx',
  'EarningsSection.tsx',
  'FAQSection.tsx',
  'FeaturesSection.tsx',
  'Footer.tsx',
  'Hero.tsx',
  'HeroSection.tsx',
  'MarketTicker.tsx',
  'MobileSection.tsx',
  'Navbar.tsx',
  'PublicTrustSection.tsx',
  'SeoContentSection.tsx',
  'StepsSection.tsx',
  'TestimonialsSection.tsx',
  'TradingPlatform.tsx',
  'WhatWeOfferSection.tsx',
];

const replacements = [
  ['bg-[linear-gradient(135deg,#1cd793_0%,#1565c0_100%)]', 'bg-[linear-gradient(135deg,hsl(var(--landing-primary))_0%,hsl(var(--landing-secondary))_100%)]'],
  ['bg-[linear-gradient(180deg,#1cd793_0%,#e6f7f5_100%)]', 'bg-[linear-gradient(180deg,hsl(var(--landing-primary))_0%,hsl(var(--landing-surface))_100%)]'],
  ['bg-[radial-gradient(circle_at_30%_30%,#ffffff_0%,#1cd793_42%,#e6f7f5_100%)]', 'bg-[radial-gradient(circle_at_30%_30%,#ffffff_0%,hsl(var(--landing-primary))_42%,hsl(var(--landing-surface))_100%)]'],
  ['bg-[#1cd793]/10', 'bg-[hsla(var(--landing-primary),0.1)]'],
  ['bg-[#1cd793]/6', 'bg-[hsla(var(--landing-primary),0.16)]'],
  ['bg-[#1cd793]', 'bg-[hsl(var(--landing-primary))]'],
  ['border-[#1cd793]/30', 'border-[hsla(var(--landing-primary),0.3)]'],
  ['border-[#1cd793]/20', 'border-[hsla(var(--landing-primary),0.2)]'],
  ['border-[#1cd793]/18', 'border-[hsla(var(--landing-primary),0.18)]'],
  ['border-[#1cd793]/60', 'border-[hsla(var(--landing-primary),0.6)]'],
  ['border-[#1cd793]', 'border-[hsl(var(--landing-primary))]'],
  ['text-[#1cd793]', 'text-[hsl(var(--landing-primary))]'],
  ['hover:text-[#1cd793]', 'hover:text-[hsl(var(--landing-primary))]'],
  ['after:bg-[#1cd793]', 'after:bg-[hsl(var(--landing-primary))]'],
  ['fill-[#1cd793]', 'fill-[hsl(var(--landing-primary))]'],
  ['color: "#1cd793"', 'color: "hsl(var(--landing-primary))"'],
  ['stroke="#1cd793"', 'stroke="hsl(var(--landing-primary))"'],
  ['rgba(28,215,147,)', 'hsla(var(--landing-primary),0.16)'],
  ['rgba(28,215,147,)_0%', 'hsla(var(--landing-primary),0.16)_0%'],
  ['bg-[radial-gradient(circle_at_top,rgba(28,215,147,),transparent_24%)]', 'bg-[radial-gradient(circle_at_top,hsla(var(--landing-primary),0.16),transparent_24%)]'],
  ['border-[#a9e2dd]', 'border-[hsl(var(--landing-border))]'],
  ['bg-[#e6f7f5]', 'bg-[hsl(var(--landing-surface))]'],
  ['border-[#a9e2dd]/20', 'border-[hsla(var(--landing-border),0.2)]'],
  ['border-[#a9e2dd]/14', 'border-[hsla(var(--landing-border),0.14)]'],
  ['border-[#a9e2dd]/24', 'border-[hsla(var(--landing-border),0.24)]'],
  ['border-[#a9e2dd]/30', 'border-[hsla(var(--landing-border),0.3)]'],
  ['border-[#a9e2dd]/50', 'border-[hsla(var(--landing-border),0.5)]'],
  ['bg-[#f5f6fa]', 'bg-[#f8f9fc]'],
  ['bg-[#ffffff]', 'bg-white'],
  ['border-[#a9e2dd] bg-white', 'border-[hsl(var(--landing-border))] bg-white'],
];

for (const fileName of affectedFiles) {
  const filePath = path.join(root, fileName);
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = content;

  for (const [from, to] of replacements) {
    updated = updated.split(from).join(to);
  }

  if (updated !== content) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log('patched', fileName);
  }
}
