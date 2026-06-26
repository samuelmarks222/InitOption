import { TournamentDirectory } from "./TournamentDirectory";

export const WorkspaceTournaments = ({
  onOpenDetails,
  onEnterTournament,
  onClose,
  directoryRefreshKey,
}: {
  onOpenDetails?: (id: string) => void;
  onEnterTournament?: (id: string) => void;
  onClose?: () => void;
  directoryRefreshKey?: number;
}) => {
  return <TournamentDirectory variant="compact" onOpenDetails={onOpenDetails} onEnterTournament={onEnterTournament} onClose={onClose} directoryRefreshKey={directoryRefreshKey} />;
};
