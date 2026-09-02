import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthRestorePath } from "@/lib/authRedirect";
import { shouldStartAtLoginOnMobile } from "@/lib/mobileLanding";
import AuthLoadingScreen from "@/components/auth/AuthLoadingScreen";
import PoolitoHomePage from "@/components/landing/PoolitoHomePage";

const Index = () => {
  const { user, loading } = useAuth();

  if (shouldStartAtLoginOnMobile()) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return <AuthLoadingScreen />
  }

  if (user) {
    return <Navigate to={getAuthRestorePath()} replace />;
  }

  return <PoolitoHomePage />;
};

export default Index;
