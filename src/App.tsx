import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DrawingProvider } from "@/contexts/DrawingContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { VipProvider } from "@/contexts/VipContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { TradingProvider } from "@/hooks/useTrading";
import { DynamicAssetProvider } from "@/contexts/DynamicAssetContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Trade from "./pages/Trade";
import Dashboard from "./pages/Dashboard";
import Deposit from "./pages/Deposit";
import Withdraw from "./pages/Withdraw";
import Settings from "./pages/Settings";
import NotificationsPage from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import PublicInfoPage from "./pages/PublicInfoPage";
import PublicTournamentDetailPage from "./pages/PublicTournamentDetailPage";
import PublicTournamentsPage from "./pages/PublicTournamentsPage";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import Finance from "./pages/admin/Finance";
import UserManagement from "./pages/admin/UserManagement";
import TradeManagement from "./pages/admin/TradeManagement";
import AssetManagement from "./pages/admin/AssetManagement";
import PlatformSettings from "./pages/admin/PlatformSettings";
import PromoCodes from "./pages/admin/PromoCodes";
import RiskManagement from "./pages/admin/RiskManagement";
import Reports from "./pages/admin/Reports";
import Notifications from "./pages/admin/Notifications";
import AuditLogs from "./pages/admin/AuditLogs";
import AdminUsers from "./pages/admin/AdminUsers";
import CryptoPayments from "./pages/admin/CryptoPayments";
import Analytics from "./pages/admin/Analytics";
import TournamentsAdmin from "./pages/admin/TournamentsAdmin";
import SupportInbox from "./pages/admin/SupportInbox";
import { applyPlatformSettingsToDocument, DEFAULT_PLATFORM_SETTINGS, type PlatformSettingsRecord } from "@/lib/platformMetadata";
import RouteSeoManager from "@/components/seo/RouteSeoManager";

const queryClient = new QueryClient();

const App = () => {
  const [platformSettings, setPlatformSettings] = useState<Partial<PlatformSettingsRecord> | null>(
    DEFAULT_PLATFORM_SETTINGS,
  );

  useEffect(() => {
    async function loadPlatformPresentation() {
      try {
        const { data } = await supabase.from("platform_settings").select("*").limit(1).maybeSingle();
        const resolvedSettings = (data as Partial<PlatformSettingsRecord> | null) ?? DEFAULT_PLATFORM_SETTINGS;
        setPlatformSettings(resolvedSettings);
        applyPlatformSettingsToDocument(resolvedSettings);
      } catch (e) {
        console.error("Failed to load platform presentation", e);
        setPlatformSettings(DEFAULT_PLATFORM_SETTINGS);
        applyPlatformSettingsToDocument(DEFAULT_PLATFORM_SETTINGS);
      }
    }
    loadPlatformPresentation();
  }, []);

  return (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <RouteSeoManager platformSettings={platformSettings} />
          <AuthProvider>
            <CurrencyProvider>
              <DrawingProvider>
                <VipProvider>
                  <NotificationProvider>
                    <DynamicAssetProvider>
                      <TradingProvider>
                        <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/about" element={<PublicInfoPage pageKey="about" />} />
                        <Route path="/how-it-works" element={<PublicInfoPage pageKey="how-it-works" />} />
                        <Route path="/trading-guide" element={<PublicInfoPage pageKey="trading-guide" />} />
                        <Route path="/faq" element={<PublicInfoPage pageKey="faq" />} />
                        <Route path="/terms" element={<PublicInfoPage pageKey="terms" />} />
                        <Route path="/privacy" element={<PublicInfoPage pageKey="privacy" />} />
                        <Route path="/risk-disclaimer" element={<PublicInfoPage pageKey="risk-disclaimer" />} />
                        <Route path="/tournaments" element={<PublicTournamentsPage platformSettings={platformSettings} />} />
                        <Route
                          path="/tournaments/:slug"
                          element={<PublicTournamentDetailPage platformSettings={platformSettings} />}
                        />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/trade" element={<ProtectedRoute><Trade /></ProtectedRoute>} />
                        <Route path="/trade/*" element={<ProtectedRoute><Trade /></ProtectedRoute>} />
                        <Route path="/deposit" element={<ProtectedRoute><Deposit /></ProtectedRoute>} />
                        <Route path="/withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
                        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
                        
                        {/* Admin Routes */}
                        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                          <Route index element={<AdminDashboard />} />
                          <Route path="dashboard" element={<AdminDashboard />} />
                          <Route path="support" element={<SupportInbox />} />
                          <Route path="users" element={<UserManagement />} />
                          <Route path="trades" element={<TradeManagement />} />
                          <Route path="finance" element={<Finance />} />
                          <Route path="assets" element={<AssetManagement />} />
                          <Route path="settings" element={<PlatformSettings />} />
                          <Route path="promos" element={<PromoCodes />} />
                          <Route path="risk" element={<RiskManagement />} />
                          <Route path="reports" element={<Reports />} />
                          <Route path="notifications" element={<Notifications />} />
                          <Route path="audit" element={<AuditLogs />} />
                          <Route path="admins" element={<AdminUsers />} />
                          <Route path="crypto-payments" element={<CryptoPayments />} />
                          <Route path="analytics" element={<Analytics />} />
                          <Route path="tournaments" element={<TournamentsAdmin />} />
                        </Route>

                        <Route path="*" element={<NotFound />} />
                        </Routes>
                      </TradingProvider>
                    </DynamicAssetProvider>
                  </NotificationProvider>
                </VipProvider>
              </DrawingProvider>
            </CurrencyProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
  );
};

export default App;
