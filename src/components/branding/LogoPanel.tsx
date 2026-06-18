import { useSiteBranding } from "@/hooks/useSiteBranding";
import { cn } from "@/lib/utils";

interface LogoPanelProps {
  className?: string;
}

export const LogoPanel = ({ className }: LogoPanelProps) => {
  const { logoUrl, platformName } = useSiteBranding();

  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Platform Logo</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          The single logo used across all platform surfaces.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="font-semibold text-gray-900 dark:text-white">Current Logo</div>

        <div className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          {logoUrl ? (
            <img src={logoUrl} alt={platformName} className="h-14 max-w-full object-contain" />
          ) : (
            <div className="text-center text-xs text-gray-500 dark:text-gray-400">
              <p>No logo</p>
              <p>uploaded</p>
            </div>
          )}
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            {logoUrl ? "Configured" : "Not configured"}
          </p>
        </div>

        <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-300">
          <p className="font-medium">Tip:</p>
          <p>Manage the logo in Platform Settings → Site Branding & Appearance</p>
        </div>
      </div>
    </div>
  );
};
