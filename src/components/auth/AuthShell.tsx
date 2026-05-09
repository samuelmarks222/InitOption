import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { SiteLogo } from "@/components/branding/SiteLogo";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

export const AuthShell = ({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthShellProps) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#09131d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(28,87,138,0.2),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(20,151,88,0.16),transparent_28%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <SiteLogo
            className="gap-2.5"
            markClassName="h-9 w-9 rounded-xl bg-[linear-gradient(135deg,#1a88ff,#17bf63)]"
          />

          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.04] px-4 py-2 font-copy text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-10 sm:py-14">
          <div className="w-full max-w-[450px]">
            <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,24,36,0.96),rgba(10,18,28,0.96))] p-6 shadow-[0_36px_100px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-8">
              <div className="inline-flex rounded-full border border-[#1b6cb2]/28 bg-[#123155] px-4 py-2 font-copy text-[11px] font-bold uppercase tracking-[0.18em] text-[#86c7ff]">
                {eyebrow}
              </div>

              <h1 className="font-display mt-5 text-3xl font-bold text-white sm:text-[2.1rem]">
                {title}
              </h1>
              <p className="font-copy mt-3 text-sm leading-7 text-slate-400 sm:text-base">
                {description}
              </p>

              <div className="mt-7">{children}</div>

              <div className="mt-7 border-t border-white/10 pt-5">{footer}</div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-center font-copy text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-[#29cf76]" />
              Secure sign in and simple account setup
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
