import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthRestorePath } from "@/lib/authRedirect";
import { shouldStartAtLoginOnMobile } from "@/lib/mobileLanding";
import AuthLoadingScreen from "@/components/auth/AuthLoadingScreen";
import LandingPage from "@/components/landing/LandingPage";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoadingScreen message="Opening Init Option..." />;
  }

  if (user) {
    return <Navigate to={getAuthRestorePath()} replace />;
  }

  if (shouldStartAtLoginOnMobile()) {
    return <Navigate to="/login" replace />;
  }

  return <LandingPage />;
};

export default Index;
