import { useProfileTour } from "@/contexts/ProfileTourContext";
import { Check, Circle } from "lucide-react";

export const WorkspaceProgress = () => {
  const { percentage, steps, startTour, tourCompleted } = useProfileTour();

  // Dynamically calculate the SVG dash offset.
  // Circle circumference is roughly 2 * pi * 36 =~ 226.19
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col h-full bg-[#14181f] text-white">
      {/* Visual Header / Circular Percentage */}
      <div className="p-8 text-center border-b border-[#ffffff10] bg-[#1a1f26]">
        <div className="relative w-28 h-28 mx-auto mb-6 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle 
              cx="56" cy="56" r={radius} 
              stroke="#2A2F36" 
              strokeWidth="6" 
              fill="transparent" 
            />
            <circle 
              cx="56" cy="56" r={radius} 
              stroke="#00C076" 
              strokeWidth="6" 
              fill="transparent" 
              strokeDasharray={circumference} 
              strokeDashoffset={offset} 
              className="drop-shadow-[0_0_8px_#00c076] transition-all duration-1000 ease-in-out"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {percentage}%
          </div>
        </div>

        <h3 className="font-bold text-[22px] mb-3 text-white">Profile Completion</h3>
        <p className="text-[13px] text-gray-400 font-medium leading-relaxed px-2">
          Complete your profile to unlock all trading features and remove deposit limits.
        </p>

        <button 
          onClick={startTour}
          className="w-full mt-6 bg-[#1a6fc4] text-white font-bold py-3.5 rounded-lg transition-all hover:bg-[#14569c] active:scale-[0.98]"
        >
          {tourCompleted ? "Replay Platform Tour" : "Open Platform Tour"}
        </button>
      </div>

      {/* Profile Checklist Steps */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
        <h4 className="text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-4 mt-2 px-1">
          Required Actions
        </h4>
        
        {steps.map((step) => (
          <div 
            key={step.id} 
            className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-[#1a1f26] transition-colors hover:bg-[#20252e]"
          >
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0 ${step.completed ? "bg-[#00c076] border-[#00c076]" : "border-gray-500 bg-transparent"}`}>
                {step.completed ? <Check className="w-3.5 h-3.5 text-white" /> : <div className="w-2 h-2 rounded-full bg-gray-500/50" />}
              </div>
              <span className={`text-[13px] font-medium ${step.completed ? "text-gray-300 line-through decoration-gray-600" : "text-white"}`}>
                {step.name}
              </span>
            </div>
            {!step.completed && (
              <span className="text-[11px] font-bold text-orange-400">
                +{step.weight}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
