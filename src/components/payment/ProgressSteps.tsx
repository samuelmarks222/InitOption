import { cn } from "@/lib/utils";

interface ProgressStepsProps {
  currentStep: number;
  labels: string[];
}

export function ProgressSteps({ currentStep, labels }: ProgressStepsProps) {
  return (
    <div className="mb-8">
      <div className="relative">
        <div className="absolute top-3 left-0 right-0 h-1 bg-white/10" />
        <div className="absolute top-3 left-0 right-0 h-1 bg-[#0fa053] transition-all duration-300"
          style={{ width: `${((currentStep - 1) / (labels.length - 1)) * 100}%` }} />
      </div>
      <div className="flex justify-between mt-4">
        {labels.map((label, index) => (
          <div
            key={label}
            className={cn(
              "flex flex-col items-center",
              index === labels.length - 1 ? "flex-1" : "flex-1"
            )}
          >
            <div
              className={cn(
                "relative flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-300",
                index + 1 < currentStep
                  ? "bg-[#0fa053] border-[#0fa053] text-white"
                  : index + 1 === currentStep
                  ? "bg-[#1e293b] border-[#0fa053] text-[#0fa053] ring-4 ring-[#0fa053]/20"
                  : "bg-[#0f141f] border-white/10 text-white/40"
              )}
            >
              {index + 1 < currentStep ? (
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-xs font-bold">{index + 1}</span>
              )}
            </div>
            <span className={cn(
              "mt-2 text-xs font-medium text-center transition-colors",
              index + 1 <= currentStep ? "text-white" : "text-white/40"
            )}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}