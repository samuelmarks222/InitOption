import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SiteLogo } from "@/components/branding/SiteLogo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#07111d] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col">
        <SiteLogo to="/" variant="dark" subtitle="Page not found" />

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full rounded-[32px] border border-white/10 bg-[#0d1826]/92 p-8 text-center shadow-[0_30px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-12">
            <div className="text-[12px] font-black uppercase tracking-[0.24em] text-slate-400">404</div>
            <h1 className="mt-5 text-4xl font-black text-white sm:text-5xl">This route does not exist.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-300">
              The page you tried to open is missing or has moved. Return to the landing page or jump back into the trading workspace.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#0ea5e9,#16a34a)] px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-white"
              >
                Return home
              </Link>
              <Link
                to="/trade"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-6 py-4 text-sm font-black uppercase tracking-[0.16em] text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Go to trade
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

