import { TournamentDirectory } from "./TournamentDirectory";

export const WorkspaceTournaments = ({
  onOpenDetails,
  onEnterTournament,
  onClose,
}: {
  onOpenDetails?: (id: string) => void;
  onEnterTournament?: (id: string) => void;
  onClose?: () => void;
}) => {
  return <TournamentDirectory variant="compact" onOpenDetails={onOpenDetails} onEnterTournament={onEnterTournament} onClose={onClose} />;
};
