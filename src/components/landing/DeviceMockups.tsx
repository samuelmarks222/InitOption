import CandlestickChart from "./CandlestickChart";
import defaultLogoUrl from "@/assets/logo.png";

const DeviceMockups = () => {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-50" />
      <div className="container relative z-10 mx-auto px-4">
        <div className="mb-16 text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--landing-primary))]">
            Multi-Device
          </span>
          <h2 className="mt-3 mb-4 font-display text-3xl font-bold sm:text-4xl">
            Trade anywhere, anytime
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            The same powerful charts, controls, and execution on desktop and mobile.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-8 lg:flex-row lg:gap-0">
          <div className="relative w-full max-w-2xl">
            <div className="overflow-hidden rounded-t-xl border border-border/60 bg-card">
              <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2.5">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                  <div className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--landing-primary))]/40" />
                  <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                </div>
                <div className="mx-4 flex-1">
                  <div className="flex h-5 items-center rounded-md bg-secondary px-3">
                    <span className="text-[10px] text-muted-foreground">
                      initoption.com/terminal
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-background p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-gold">
                      <img src={defaultLogoUrl} alt="Init Option" className="h-4 w-4 object-contain" />
                    </div>
                    <div className="flex gap-2">
                      {["EUR/USD", "BTC/USD", "XAU/USD"].map((pair) => (
                        <span
                          key={pair}
                          className="rounded bg-secondary px-2 py-0.5 text-[9px] text-muted-foreground"
                        >
                          {pair}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded bg-[hsl(var(--landing-primary))]/10 px-2 py-0.5 text-[9px] font-medium text-[hsl(var(--landing-primary))]">
                      92%
                    </span>
                    <span className="text-[9px] text-muted-foreground">Demo</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 rounded-lg border border-border/30 bg-secondary/30 p-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[9px] font-medium text-foreground">EUR/USD</span>
                      <span className="text-[9px] font-bold text-[hsl(var(--landing-primary))]">1.08452</span>
                    </div>
                    <CandlestickChart width={440} height={160} candleCount={30} />
                  </div>

                  <div className="w-28 space-y-2">
                    <div className="rounded-lg border border-border/30 bg-secondary/30 p-2">
                      <span className="mb-1 block text-[8px] text-muted-foreground">Payout</span>
                      <span className="text-sm font-bold text-[hsl(var(--landing-primary))]">+95%</span>
                    </div>
                    <div className="rounded-lg border border-border/30 bg-secondary/30 p-2">
                      <span className="mb-1 block text-[8px] text-muted-foreground">Investment</span>
                      <span className="text-xs font-bold text-foreground">$50.00</span>
                    </div>
                    <div className="rounded-lg border border-border/30 bg-secondary/30 p-2">
                      <span className="mb-1 block text-[8px] text-muted-foreground">Expiry</span>
                      <span className="text-xs font-bold text-foreground">01:00</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <button className="rounded bg-[hsl(var(--landing-primary))] py-1.5 text-[9px] font-bold text-[hsl(var(--landing-primary-foreground))]">
                        Higher
                      </button>
                      <button className="rounded bg-destructive py-1.5 text-[9px] font-bold text-foreground">
                        Lower
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mx-8 h-4 rounded-b-lg border-x border-border/60 bg-secondary" />
            <div className="mx-20 h-1.5 rounded-b-lg bg-muted" />
          </div>

          <div className="relative lg:-ml-16 lg:mt-12">
            <div className="w-[200px] overflow-hidden rounded-[24px] border-2 border-border/60 bg-card shadow-elevated">
              <div className="bg-background pb-1 pt-2">
                <div className="mx-auto h-4 w-16 rounded-full bg-secondary" />
              </div>

              <div className="bg-background px-2.5 pb-3">
                <div className="flex items-center justify-between px-1 py-1.5">
                  <span className="text-[7px] text-muted-foreground">9:41</span>
                  <div className="flex gap-1">
                    <div className="h-1.5 w-3 rounded-sm bg-muted-foreground/50" />
                    <div className="h-1.5 w-2 rounded-sm bg-muted-foreground/30" />
                  </div>
                </div>

                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className="flex h-4 w-4 items-center justify-center rounded bg-gradient-gold">
                      <img src={defaultLogoUrl} alt="Init Option" className="h-2.5 w-2.5 object-contain" />
                    </div>
                    <span className="text-[8px] font-semibold text-foreground">EUR/USD</span>
                  </div>
                  <span className="text-[8px] font-bold text-[hsl(var(--landing-primary))]">92%</span>
                </div>

                <div className="mb-2 rounded-lg border border-border/30 bg-secondary/30 p-1.5">
                  <CandlestickChart width={170} height={120} candleCount={18} />
                </div>

                <div className="space-y-1.5">
                  <div className="flex gap-1.5">
                    <div className="flex-1 rounded border border-border/30 bg-secondary/30 p-1.5">
                      <span className="block text-[6px] text-muted-foreground">Amount</span>
                      <span className="text-[9px] font-bold text-foreground">$50</span>
                    </div>
                    <div className="flex-1 rounded border border-border/30 bg-secondary/30 p-1.5">
                      <span className="block text-[6px] text-muted-foreground">Expiry</span>
                      <span className="text-[9px] font-bold text-foreground">01:00</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button className="rounded-lg bg-[hsl(var(--landing-primary))] py-2 text-[8px] font-bold text-[hsl(var(--landing-primary-foreground))]">
                      Higher
                    </button>
                    <button className="rounded-lg bg-destructive py-2 text-[8px] font-bold text-foreground">
                      Lower
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-center bg-background pb-1.5">
                <div className="h-1 w-12 rounded-full bg-muted-foreground/30" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DeviceMockups;
