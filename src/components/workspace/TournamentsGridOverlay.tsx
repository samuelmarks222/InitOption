import { TournamentDashboard } from "./TournamentDashboard";

interface TournamentsGridOverlayProps {
  onOpenDetails?: (id: string) => void;
  onEnterTournament?: (id: string) => void;
  onClose?: () => void;
  directoryRefreshKey?: number;
}

export const TournamentsGridOverlay = ({ onEnterTournament, onClose, directoryRefreshKey }: TournamentsGridOverlayProps) => {
  return <TournamentDashboard onEnterTournament={onEnterTournament} onClose={onClose} directoryRefreshKey={directoryRefreshKey} />;
};
