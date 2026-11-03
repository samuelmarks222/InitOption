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
    <div className="io-public-shell flex min-h-screen flex-col overflow-x-hidden bg-white text-[#161D24]">
      <Navbar />

      <main className="relative flex flex-1 items-center justify-center bg-gradient-to-b from-[#EAF6EF] via-[#F5FAF7] to-white px-4 py-16 sm:px-6 lg:px-8">
        <div
          aria-hidden="true"
          className="io-grid-pattern pointer-events-none absolute inset-0 opacity-90 [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]"
        />

        <div className="io-glass-card relative z-10 w-full max-w-2xl rounded-[32px] p-8 text-center sm:p-14">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#CBE4D4] bg-[#EAF6EE] text-[#2E7971]">
            <Compass className="h-7 w-7" />
          </div>
          <div className="mt-5">
            <span className="io-eyebrow-pill">Error 404</span>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-[#161D24] sm:text-5xl">
            Page Not Found
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#55626E] sm:text-base">
            The route{" "}
            <code className="rounded-md border border-[#D4E6DC] bg-[#EEF8F2] px-2 py-0.5 font-mono text-xs font-semibold text-[#2E7971]">
              {location.pathname}
            </code>{" "}
            does not exist or may have moved. Return to the homepage or open the trading terminal directly.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Link
              to="/"
              className="io-sage-btn inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-bold text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return Home</span>
            </Link>
            <Link
              to="/trade"
              className="io-dark-btn inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-semibold text-white"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
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
