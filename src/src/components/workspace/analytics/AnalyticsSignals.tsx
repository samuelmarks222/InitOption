import { type ReactNode } from "react";
import { BellRing, BrainCircuit } from "lucide-react";

export const AnalyticsSignals = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <UnavailableCard
          icon={<BrainCircuit className="h-8 w-8 text-[#0fa053]" />}
          title="Prediction Accuracy Unavailable"
          description="No real signal engine or verification dataset is connected, so this module no longer fabricates AI accuracy percentages."
        />
        <UnavailableCard
          icon={<BellRing className="h-8 w-8 text-[#0fa053]" />}
          title="Signal History Unavailable"
          description="Historic signal verification will appear here once a real signal feed and outcome tracking pipeline are connected."
        />
      </div>

      <div className="rounded-2xl border border-dashed border-white/10 bg-[#1A1F26] p-8 text-center shadow-sm">
        <BellRing className="mx-auto mb-4 h-10 w-10 text-[#0fa053]/60" />
        <h3 className="text-[18px] font-bold text-white">No Verified Signals to Display</h3>
        <p className="mx-auto mt-3 max-w-2xl text-[13px] leading-6 text-gray-400">
          This panel intentionally stays empty until signal generation, storage, and verification are backed by real platform
          data. Random confidence scores and made-up outcomes have been removed.
        </p>
      </div>
    </div>
  );
};

const UnavailableCard = ({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) => (
  <div className="rounded-2xl border border-white/5 bg-[#1A1F26] p-6 shadow-sm">
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">{icon}</div>
    <h3 className="text-[16px] font-bold text-white">{title}</h3>
    <p className="mt-3 text-[13px] leading-6 text-gray-400">{description}</p>
  </div>
);

