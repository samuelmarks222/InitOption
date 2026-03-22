import React, { useState } from "react";
import { Search, X, Settings2, Trash2, Eye, EyeOff, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { IndicatorConfig, ActiveIndicator, IndicatorCategory } from "./types";
import { INDICATOR_REGISTRY } from "./config";
import IndicatorSettingsModal from "./IndicatorSettingsModal";

interface IndicatorsPanelProps {
  activeIndicators: ActiveIndicator[];
  onAddIndicator: (configId: string) => void;
  onUpdateIndicator: (instanceId: string, updates: Partial<ActiveIndicator>) => void;
  onRemoveIndicator: (instanceId: string) => void;
  onClose: () => void;
}

const CATEGORIES: IndicatorCategory[] = ["Trend Indicators", "Oscillators", "Volatility", "Volume"];

export const IndicatorsPanel = ({ activeIndicators, onAddIndicator, onUpdateIndicator, onRemoveIndicator, onClose }: IndicatorsPanelProps) => {
  const [activeTab, setActiveTab] = useState<"catalog" | "active">("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    "Trend Indicators": true, "Oscillators": true, "Volatility": true, "Volume": true
  });
  
  const [editingIndicator, setEditingIndicator] = useState<ActiveIndicator | null>(null);

  const toggleCategory = (cat: string) => setExpandedCategories(p => ({ ...p, [cat]: !p[cat] }));

  const filteredRegistry = INDICATOR_REGISTRY.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <div className="absolute top-0 left-[60px] w-[340px] bottom-0 bg-[#1c1f28] border-r border-[#2a2d3e] flex flex-col z-50 shadow-2xl animate-in slide-in-from-left-8">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-[#2A303C] shrink-0">
          <h2 className="text-white font-bold text-lg">Indicators</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 pt-4 border-b border-[#2A303C] shrink-0 gap-4">
          <button 
            className={`pb-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'catalog' ? 'border-orange-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            onClick={() => setActiveTab('catalog')}
          >
            All Indicators
          </button>
          <button 
            className={`pb-2 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'active' ? 'border-orange-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            onClick={() => setActiveTab('active')}
          >
            Added <span className="bg-[#2A303C] text-[10px] px-1.5 py-0.5 rounded-full">{activeIndicators.length}</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 custom-scrollbar">
          {activeTab === "catalog" ? (
            <div className="p-4 space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search indicators..." 
                  className="w-full bg-[#0E1217] text-white text-sm rounded-md pl-9 pr-3 py-2 outline-none border border-[#2A303C] hover:border-white/20 focus:border-orange-500 transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                {CATEGORIES.map(category => {
                  const items = filteredRegistry.filter(i => i.category === category);
                  if (items.length === 0) return null;
                  const isExpanded = expandedCategories[category];

                  return (
                    <div key={category} className="border border-[#2A303C] rounded-md overflow-hidden bg-[#0E1217]">
                      <button 
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-[#1A1F26] hover:bg-[#2A303C] transition-colors"
                      >
                        <span className="text-gray-300 text-xs font-bold uppercase tracking-wider">{category} <span className="text-gray-500 ml-1">({items.length})</span></span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </button>
                      
                      {isExpanded && (
                        <div className="divide-y divide-[#2A303C]">
                          {items.map(indicator => (
                            <div 
                              key={indicator.id} 
                              className="flex items-center justify-between px-3 py-2.5 hover:bg-white/5 group transition-colors cursor-pointer"
                              onClick={() => onAddIndicator(indicator.id)}
                            >
                              <span className="text-sm text-gray-300 group-hover:text-white transition-colors pointer-events-none">{indicator.name}</span>
                              <button 
                                className="w-6 h-6 rounded bg-white/5 group-hover:bg-orange-500 flex items-center justify-center text-gray-400 group-hover:text-white transition-all pointer-events-none"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {activeIndicators.length === 0 ? (
                <div className="text-center py-10 text-gray-500 space-y-2">
                  <Settings2 className="w-10 h-10 mx-auto opacity-20" />
                  <p className="text-sm">No indicators added yet.</p>
                </div>
              ) : (
                activeIndicators.map(ind => (
                  <div key={ind.instanceId} className="flex items-center justify-between p-3 bg-[#0E1217] border border-[#2A303C] rounded-md hover:border-white/20 transition-colors group">
                    <span className="text-sm text-gray-200 font-medium">{ind.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onUpdateIndicator(ind.instanceId, { visible: !ind.visible })}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                        title={ind.visible ? "Hide indicator" : "Show indicator"}
                      >
                        {ind.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => setEditingIndicator(ind)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                        title="Settings"
                      >
                        <Settings2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onRemoveIndicator(ind.instanceId)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {editingIndicator && (
        <IndicatorSettingsModal 
          indicator={editingIndicator} 
          onSave={(updates) => {
            onUpdateIndicator(editingIndicator.instanceId, updates);
            setEditingIndicator(null);
          }}
          onClose={() => setEditingIndicator(null)} 
        />
      )}
    </>
  );
};

export default IndicatorsPanel;
