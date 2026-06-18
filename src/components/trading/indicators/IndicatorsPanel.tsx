import { ChevronDown, ChevronRight, Eye, EyeOff, Plus, Search, Settings2, Trash2, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { ActiveIndicator, IndicatorCategory } from "./types";
import { INDICATOR_REGISTRY, STANDARD_INDICATOR_IDS } from "./config";
import { INDICATOR_ICONS } from "./indicatorIcons";
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

interface PanelCategory {
  name: string;
  items: string[];
}

const PANEL_BG = "#1A1A2A";
const CATEGORY_BG = "#1d2332";

const PANEL_CATEGORIES: PanelCategory[] = [
  {
    name: "Popular",
    items: ["sma", "bollinger", "rsi", "macd", "stochastic", "volume", "ichimoku", "supertrend"],
  },
  {
    name: "Momentum",
    items: ["rsi", "stochastic", "cci", "momentum", "roc", "williamsR", "awesome"],
  },
  {
    name: "Trend",
    items: ["sma", "ema", "wma", "hma", "bollinger", "envelopes", "ichimoku", "supertrend", "alligator", "parabolic", "zigzag"],
  },
  {
    name: "Volatility",
    items: ["atr", "keltner", "donchian", "bollinger"],
  },
  {
    name: "Moving Averages",
    items: ["sma", "ema", "wma", "hma"],
  },
  {
    name: "Volume",
    items: ["volume", "obv", "volumeOsc"],
  },
  {
    name: "Other",
    items: ["adx", "aroon", "demarker", "bullsPower", "bearsPower", "schaff", "vortex", "fractal"],
  },
];

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
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    PANEL_CATEGORIES.forEach((c) => { initial[c.name] = true; });
    return initial;
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

  const toggleCategory = (name: string) =>
    setExpandedCategories((prev) => ({ ...prev, [name]: !prev[name] }));

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return PANEL_CATEGORIES;

    return PANEL_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter((id) => {
        const reg = INDICATOR_REGISTRY.find((r) => r.id === id);
        if (!reg) return false;
        return (
          reg.name.toLowerCase().includes(query) ||
          reg.id.toLowerCase().includes(query)
        );
      }),
    })).filter((cat) => cat.items.length > 0);
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
            <div className="flex items-center gap-2">
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[12px] font-semibold text-white">Indicators</span>
            </div>
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

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-2">
            {activeTab === "catalog" ? (
              <div className="space-y-2">
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

                <div className="space-y-2">
                  {filteredCategories.map((cat) => {
                    const isExpanded = expandedCategories[cat.name] ?? true;
                    return (
                      <section
                        key={cat.name}
                        className="overflow-hidden rounded-[6px]"
                        style={{ border: "1px solid rgba(255,255,255,0.06)", backgroundColor: CATEGORY_BG }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleCategory(cat.name)}
                          className="flex w-full items-center justify-between px-2.5 py-2 text-left transition-colors hover:bg-white/5"
                        >
                          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
                            {cat.name}
                          </span>
                          <ChevronDown
                            className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
                              isExpanded ? "rotate-0" : "-rotate-90"
                            }`}
                          />
                        </button>
                        {isExpanded && (
                          <div className="pb-1">
                            {cat.items.map((id) => {
                              const reg = INDICATOR_REGISTRY.find((r) => r.id === id);
                              if (!reg) return null;
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => onAddIndicator(id)}
                                  className="group flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left transition-colors"
                                  style={{ color: "#c8d0dc" }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "#2A2A3A";
                                    e.currentTarget.style.color = "#ffffff";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "transparent";
                                    e.currentTarget.style.color = "#c8d0dc";
                                  }}
                                >
                                  <span
                                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] transition-colors"
                                    style={{ color: "#c8d0dc" }}
                                  >
                                    {INDICATOR_ICONS[id] || null}
                                  </span>
                                  <span className="truncate text-[12px] font-medium">{reg.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              </div>
            ) : activeIndicators.length === 0 ? (
              <div
                className="rounded-[4px] border border-dashed border-white/10 px-3 py-6 text-center text-[12px] text-slate-400"
                style={{ backgroundColor: CATEGORY_BG }}
              >
                No indicators added.
              </div>
            ) : (
              <div className="space-y-2">
                {activeIndicators.map((indicator) => (
                  <div
                    key={indicator.instanceId}
                    className="rounded-[4px] border border-white/6 px-2.5 py-2"
                    style={{ backgroundColor: CATEGORY_BG }}
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
