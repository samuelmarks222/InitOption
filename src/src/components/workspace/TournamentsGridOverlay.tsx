import { TournamentDirectory } from "./TournamentDirectory";

interface TournamentsGridOverlayProps {
  onOpenDetails?: (id: string) => void;
}

export const TournamentsGridOverlay = ({ onOpenDetails }: TournamentsGridOverlayProps) => {
  return <TournamentDirectory variant="full" onOpenDetails={onOpenDetails} />;
};
