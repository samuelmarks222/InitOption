import { TournamentDirectory } from "./TournamentDirectory";

interface TournamentsGridOverlayProps {
  onOpenDetails?: (id: string) => void;
  onEnterTournament?: (id: string) => void;
  onClose?: () => void;
}

export const TournamentsGridOverlay = ({ onOpenDetails, onEnterTournament, onClose }: TournamentsGridOverlayProps) => {
  return <TournamentDirectory variant="full" onOpenDetails={onOpenDetails} onEnterTournament={onEnterTournament} onClose={onClose} />;
};
