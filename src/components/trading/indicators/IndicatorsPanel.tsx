import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { ActiveIndicator, IndicatorCategory } from "./types";
import { INDICATOR_REGISTRY, STANDARD_INDICATOR_IDS } from "./config";
import IndicatorSettingsEditor from "./IndicatorSettingsEditor";

interface IndicatorsPanelProps {
  activeIndicators: ActiveIndicator[];
  onAddIndicator: (configId: string) => void;
  onUpdateIndicator: (instanceId: string, updates: Partial<ActiveIndicator>) => void;
  onRemoveIndicator: (instanceId: string) => void;
  editingIndicatorId?: string | null;
  onEditingIndicatorChange?: (instanceId: string | null) => void;
  onClose: () => void;
}

const CATEGORIES: IndicatorCategory[] = ["Trend Indicators", "Oscillators", "Volatility", "Volume"];

const CATEGORY_ACCENTS: Record<IndicatorCategory, string> = {
  "Trend Indicators": "#22c55e",
  "Oscillators": "#3291ff",
  Volatility: "#f59e0b",
  Volume: "#1fd2cf",
};

export const IndicatorsPanel = ({
  activeIndicators,
  onAddIndicator,
  onUpdateIndicator,
  onRemoveIndicator,
  editingIndicatorId,
  onEditingIndicatorChange,
  onClose,
}: IndicatorsPanelProps) => {
  const [activeTab, setActiveTab] = useState<"catalog" | "active">("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    "Trend Indicators": true,
    Oscillators: true,
    Volatility: true,
    Volume: true,
  });
  const [localEditingIndicatorId, setLocalEditingIndicatorId] = useState<string | null>(null);

  const resolvedEditingIndicatorId =
    editingIndicatorId !== undefined ? editingIndicatorId : localEditingIndicatorId;
  const editingIndicator =
    activeIndicators.find((indicator) => indicator.instanceId === resolvedEditingIndicatorId) ?? null;

  const setEditingIndicatorId = (instanceId: string | null) => {
    if (onEditingIndicatorChange) {
      onEditingIndicatorChange(instanceId);
      return;
    }
    setLocalEditingIndicatorId(instanceId);
  };

  useEffect(() => {
    if (!resolvedEditingIndicatorId) return;
    if (editingIndicator) return;
    setEditingIndicatorId(null);
  }, [editingIndicator, resolvedEditingIndicatorId]);

  const toggleCategory = (category: string) =>
    setExpandedCategories((current) => ({ ...current, [category]: !current[category] }));

  const filteredRegistry = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return INDICATOR_REGISTRY.filter((indicator) => {
      if (!STANDARD_INDICATOR_IDS.has(indicator.id)) return false;
      if (!query) return true;

      return (
        indicator.name.toLowerCase().includes(query)
        || indicator.id.toLowerCase().includes(query)
        || indicator.category.toLowerCase().includes(query)
      );
    });
  }, [searchQuery]);

  return (
    <div
      className={`absolute bottom-0 left-0 top-0 z-[95] flex flex-col border-r border-[#2b3241] animate-in slide-in-from-left-8 lg:left-[60px] ${
        editingIndicator
          ? "w-full max-w-[208px] bg-[#1d2332]"
          : "w-full max-w-[240px] bg-[#1d2332]"
      }`}
    >
      {editingIndicator ? (
        <IndicatorSettingsEditor
          indicator={editingIndicator}
          onSave={(updates) => onUpdateIndicator(editingIndicator.instanceId, updates)}
          onDelete={() => onRemoveIndicator(editingIndicator.instanceId)}
          onBack={() => setEditingIndicatorId(null)}
          onClose={onClose}
        />
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-white/6 px-3 py-2.5">
            <span className="text-[12px] font-semibold text-white">Indicators</span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-[4px] p-1 text-slate-400 transition-colors hover:bg-white/8 hover:text-white"
              aria-label="Close indicators"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1 border-b border-white/6 px-2 py-2">
            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={`rounded-[4px] px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                activeTab === "catalog"
                  ? "bg-[#2a3142] text-white"
                  : "text-slate-400 hover:bg-white/6 hover:text-white"
              }`}
            >
              Catalog
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={`rounded-[4px] px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                activeTab === "active"
                  ? "bg-[#2a3142] text-white"
                  : "text-slate-400 hover:bg-white/6 hover:text-white"
              }`}
            >
              Active
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-2">
            {activeTab === "catalog" ? (
              <div className="space-y-3">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search"
                    className="h-9 w-full rounded-[4px] border border-[#434b5e] bg-[#202738] pl-8 pr-3 text-[12px] text-white outline-none placeholder:text-slate-500"
                  />
                </label>

                {CATEGORIES.map((category) => {
                  const items = filteredRegistry.filter((indicator) => indicator.category === category);
                  if (items.length === 0) return null;

                  const isExpanded = expandedCategories[category];

                  return (
                    <section key={category} className="overflow-hidden rounded-[4px] border border-white/6 bg-[#202738]">
                      <button
                        type="button"
                        onClick={() => toggleCategory(category)}
                        className="flex w-full items-center justify-between gap-3 px-2.5 py-2 text-left"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2 w-2 flex-shrink-0 rounded-full"
                            style={{ backgroundColor: CATEGORY_ACCENTS[category] }}
                          />
                          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
                            {category}
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="border-t border-white/6 py-1">
                          {items.map((indicator) => (
                            <button
                              key={indicator.id}
                              type="button"
                              onClick={() => onAddIndicator(indicator.id)}
                              className="flex w-full items-center justify-between gap-3 px-2.5 py-2 text-left transition-colors hover:bg-white/5"
                            >
                              <span className="truncate text-[12px] font-medium text-white">
                                {indicator.name}
                              </span>
                              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#2a3142] text-white">
                                <Plus className="h-3 w-3" />
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            ) : activeIndicators.length === 0 ? (
              <div className="rounded-[4px] border border-dashed border-white/10 bg-[#202738] px-3 py-6 text-center text-[12px] text-slate-400">
                No indicators added.
              </div>
            ) : (
              <div className="space-y-2">
                {activeIndicators.map((indicator) => (
                  <div
                    key={indicator.instanceId}
                    className="rounded-[4px] border border-white/6 bg-[#202738] px-2.5 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[12px] font-semibold text-white">
                        {indicator.name}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => onUpdateIndicator(indicator.instanceId, { visible: !indicator.visible })}
                          className="rounded-[4px] p-1 text-slate-400 transition-colors hover:bg-white/8 hover:text-white"
                          title={indicator.visible ? "Hide indicator" : "Show indicator"}
                        >
                          {indicator.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingIndicatorId(indicator.instanceId)}
                          className="rounded-[4px] p-1 text-slate-400 transition-colors hover:bg-white/8 hover:text-white"
                          title="Indicator settings"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveIndicator(indicator.instanceId)}
                          className="rounded-[4px] p-1 text-[#f27a72] transition-colors hover:bg-[#f27a72]/10 hover:text-[#ff9a92]"
                          title="Remove indicator"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default IndicatorsPanel;
