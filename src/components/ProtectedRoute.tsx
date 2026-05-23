import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import AuthLoadingScreen from "@/components/auth/AuthLoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { saveAuthRestorePath } from "@/lib/authRedirect";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;

    saveAuthRestorePath(`${location.pathname}${location.search}${location.hash}`);
  }, [location.hash, location.pathname, location.search, user]);

  if (loading) {
    return <AuthLoadingScreen message="Checking your account..." />;
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
