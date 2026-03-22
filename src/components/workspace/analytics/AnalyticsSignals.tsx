import { useState, useMemo } from "react";
import { Check, X, Target, BellRing, BrainCircuit } from "lucide-react";
import { useStatistics } from "@/hooks/useStatistics";

const SIGNALS = [
  { asset: "EUR/USD", direction: "UP", confidence: 84, expiry: "5m", change: "+0.32%", won: true },
  { asset: "GBP/JPY", direction: "DOWN", confidence: 76, expiry: "3m", change: "-0.18%", won: false },
  { asset: "TSLA", direction: "UP", confidence: 91, expiry: "15m", change: "+1.24%", won: true },
  { asset: "AAPL", direction: "UP", confidence: 68, expiry: "5m", change: "+0.52%", won: false },
  { asset: "NVDA", direction: "DOWN", confidence: 73, expiry: "10m", change: "-0.77%", won: true },
  { asset: "BTC/USD", direction: "UP", confidence: 88, expiry: "30m", change: "+2.14%", won: true },
];

export const AnalyticsSignals = () => {

  const totalSignals = SIGNALS.length;
  const truePositives = SIGNALS.filter(s => s.direction === "UP" && s.won).length;
  const falsePositives = SIGNALS.filter(s => s.direction === "UP" && !s.won).length;
  const trueNegatives = SIGNALS.filter(s => s.direction === "DOWN" && s.won).length;
  const falseNegatives = SIGNALS.filter(s => s.direction === "DOWN" && !s.won).length;

  const accuracy = ((truePositives + trueNegatives) / totalSignals) * 100;

  return (
    <div className="space-y-6">
      
      {/* 2 Cards Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1A1F26] border border-white/5 rounded-2xl p-6 shadow-sm flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <BrainCircuit className="w-8 h-8 text-blue-500" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-gray-500 tracking-wider uppercase mb-1">AI Prediction Accuracy</h3>
            <div className="text-[32px] font-black text-white">{accuracy.toFixed(1)}%</div>
          </div>
        </div>

        <div className="bg-[#1A1F26] border border-white/5 rounded-2xl p-6 shadow-sm flex relative overflow-hidden">
          <div className="relative z-10 w-full">
            <h3 className="text-[14px] font-bold text-gray-500 tracking-wider uppercase mb-4">Confusion Matrix</h3>
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <div className="text-[12px] text-gray-400 mb-1">True Positive (Call Won)</div>
                  <div className="text-[20px] font-bold text-[#00C076]">{truePositives}</div>
               </div>
               <div>
                  <div className="text-[12px] text-gray-400 mb-1">False Positive (Call Lost)</div>
                  <div className="text-[20px] font-bold text-red-500">{falsePositives}</div>
               </div>
               <div>
                  <div className="text-[12px] text-gray-400 mb-1">True Negative (Put Won)</div>
                  <div className="text-[20px] font-bold text-[#00C076]">{trueNegatives}</div>
               </div>
               <div>
                  <div className="text-[12px] text-gray-400 mb-1">False Negative (Put Lost)</div>
                  <div className="text-[20px] font-bold text-red-500">{falseNegatives}</div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signals List Table */}
      <div className="bg-[#1A1F26] border border-white/5 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[16px] font-bold text-white flex items-center gap-2">
            <BellRing className="w-4 h-4 text-orange-400" /> Historic Signal Verification
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[12px] text-gray-500 font-bold uppercase tracking-wider">
                <th className="pb-4">Asset</th>
                <th className="pb-4">Signal</th>
                <th className="pb-4">Confidence</th>
                <th className="pb-4 text-right">Actual Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {SIGNALS.map((s, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="py-4 font-bold text-white text-[14px]">{s.asset}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wider border ${
                      s.direction === "UP" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      {s.direction === "UP" ? "Call Signal" : "Put Signal"}
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                       <Target className="w-4 h-4 text-gray-500" />
                       <span className="text-[13px] font-bold text-white">{s.confidence}%</span>
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       {s.won ? (
                          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                             <Check className="w-3.5 h-3.5 text-green-500" />
                          </div>
                       ) : (
                          <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                             <X className="w-3.5 h-3.5 text-red-500" />
                          </div>
                       )}
                       <span className={`text-[13px] font-bold uppercase ${s.won ? "text-green-500" : "text-red-500"}`}>
                          {s.won ? "Accurate" : "Failed"}
                       </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
