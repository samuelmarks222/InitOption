import { TournamentDirectory } from "./TournamentDirectory";

export const WorkspaceTournaments = ({
  onOpenDetails,
  onClose,
}: {
  onOpenDetails?: (id: string) => void;
  onClose?: () => void;
}) => {
  return <TournamentDirectory variant="compact" onOpenDetails={onOpenDetails} onClose={onClose} />;
};
