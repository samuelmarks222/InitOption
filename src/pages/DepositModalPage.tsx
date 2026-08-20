import { useNavigate } from "react-router-dom";
import { DepositModal } from "@/components/trading/AccountModals";

const DepositModalPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#131827]">
      <DepositModal onClose={() => navigate("/trade")} />
    </div>
  );
};

export default DepositModalPage;
