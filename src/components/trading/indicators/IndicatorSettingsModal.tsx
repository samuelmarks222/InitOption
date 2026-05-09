import React from "react";
import { ActiveIndicator } from "./types";
import IndicatorSettingsEditor from "./IndicatorSettingsEditor";

interface IndicatorSettingsModalProps {
  indicator: ActiveIndicator;
  onSave: (updates: Partial<ActiveIndicator>) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export default function IndicatorSettingsModal({
  indicator,
  onSave,
  onDelete,
  onClose,
}: IndicatorSettingsModalProps) {
  return (
    <div className="fixed inset-0 z-[110]">
      <button
        type="button"
        aria-label="Close indicator settings"
        className="absolute inset-0 cursor-default bg-transparent"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 left-0 sm:left-[60px]" onClick={(event) => event.stopPropagation()}>
        <IndicatorSettingsEditor
          indicator={indicator}
          onSave={onSave}
          onDelete={
            onDelete
              ? () => {
                  onDelete();
                  onClose();
                }
              : undefined
          }
          onBack={onClose}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
