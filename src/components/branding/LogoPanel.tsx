import { useSiteBranding } from "@/hooks/useSiteBranding";
import { cn } from "@/lib/utils";

interface LogoPanelProps {
  className?: string;
  showContext?: boolean;
}

const LOGO_CONTEXTS = [
  {
    id: "light",
    label: "Light Theme Logo",
    description: "Used on light backgrounds (Hero section)",
    contexts: ["Landing", "Hero Section"],
  },
  {
    id: "dark",
    label: "Dark Theme Logo",
    description: "Used on dark backgrounds (Navigation, Dashboard)",
    contexts: ["Navbar", "Dashboard", "Auth Pages"],
  },
  {
    id: "dashboard",
    label: "Dashboard Logo",
    description: "Primary dashboard and authenticated areas",
    contexts: ["Trading Dashboard", "Account Settings"],
  },
  {
    id: "admin",
    label: "Admin Panel Logo",
    description: "Administration and platform management",
    contexts: ["Admin Sidebar", "Admin Pages"],
  },
];

export const LogoPanel = ({ className, showContext = true }: LogoPanelProps) => {
  const { logoUrl, logoUrlLight, logoUrlDark } = useSiteBranding();

  const logoVariants = [
    { id: "light", url: logoUrlLight, label: "Light Background Logo" },
    { id: "dark", url: logoUrlDark, label: "Dark Background Logo" },
    { id: "primary", url: logoUrl, label: "Primary Logo" },
  ];

  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Logo Variants</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Platform logos used across different contexts and themes
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {LOGO_CONTEXTS.map((context) => (
          <div
            key={context.id}
            className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
          >
            <h3 className="font-semibold text-gray-900 dark:text-white">{context.label}</h3>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{context.description}</p>

            {showContext && (
              <div className="mt-3 space-y-1">
                {context.contexts.map((ctx) => (
                  <div key={ctx} className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    → {ctx}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="font-semibold text-gray-900 dark:text-white">Current Logo Variants</div>

        <div className="grid gap-4 md:grid-cols-3">
          {logoVariants.map((variant) => (
            <div
              key={variant.id}
              className="flex flex-col rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">{variant.label}</p>

              <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-100 p-4 dark:border-gray-600 dark:bg-gray-700">
                {variant.url ? (
                  <img src={variant.url} alt={variant.label} className="h-12 max-w-full object-contain" />
                ) : (
                  <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                    <p>No logo</p>
                    <p>uploaded</p>
                  </div>
                )}
              </div>

              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                {variant.url ? "Configured" : "Not configured"}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-300">
          <p className="font-medium">💡 Tip:</p>
          <p>Manage logos in Platform Settings → Site Branding & Appearance</p>
        </div>
      </div>
    </div>
  );
};
