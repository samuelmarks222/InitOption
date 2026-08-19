import { X } from "lucide-react";
import { TournamentsPage } from "./TournamentDashboard";

interface TournamentsGridOverlayProps {
  onEnterTournament?: (id: string) => void;
  onOpenDeposit?: () => void;
  onClose?: () => void;
  directoryRefreshKey?: number;
}

export const TournamentsGridOverlay = ({ onEnterTournament, onOpenDeposit, onClose, directoryRefreshKey }: TournamentsGridOverlayProps) => {
  return (
    <div className="flex h-full w-full flex-col">
      {onClose && (
        <div className="flex shrink-0 items-center justify-between border-b border-[#2a3340] bg-[#1e2530] px-5 py-3">
          <h2 className="text-[15px] font-bold text-white">Tournaments</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7a8aa8] transition-colors hover:bg-[#2a3340] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <TournamentsPage onEnterTournament={onEnterTournament} onOpenDeposit={onOpenDeposit} directoryRefreshKey={directoryRefreshKey} />
      </div>
    </div>
  );
};
