import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Compass, Play } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="io-public-shell flex min-h-screen flex-col overflow-x-hidden bg-[#080d16] text-slate-100">
      <Navbar />

      <main className="relative flex flex-1 items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div
          aria-hidden="true"
          className="io-grid-pattern pointer-events-none absolute inset-0 opacity-45 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(16,184,107,0.16),transparent_68%)] blur-3xl"
        />

        <div className="io-glass-card relative z-10 w-full max-w-2xl rounded-[32px] p-8 text-center sm:p-14">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/12 text-emerald-400">
            <Compass className="h-7 w-7" />
          </div>
          <div className="mt-5 text-xs font-extrabold uppercase tracking-[0.26em] text-emerald-400">
            Error 404
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Page Not Found
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-slate-300 sm:text-base">
            The route <code className="rounded bg-white/[0.06] px-2 py-0.5 text-emerald-300">{location.pathname}</code> does not exist or may have moved. Return to the homepage or open the trading terminal directly.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              to="/"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#10b86b] to-[#0ea35e] px-7 text-sm font-bold text-white shadow-[0_14px_32px_rgba(16,184,107,0.3)] transition-all hover:-translate-y-0.5 hover:brightness-110"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return Home</span>
            </Link>
            <Link
              to="/trade"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-7 text-sm font-semibold text-white transition-colors hover:bg-white/[0.1]"
            >
              <Play className="h-3.5 w-3.5 fill-current text-emerald-400" />
              <span>Open Trading Desk</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
