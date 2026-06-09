import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

interface HelpCenterOverlayProps {
  onClose?: () => void;
}

// Redirect to full trading guide page instead of modal overlay
export const HelpCenterOverlay = ({ onClose }: HelpCenterOverlayProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/trading-guide");
    onClose?.();
  }, [navigate, onClose]);

  return null;
};
