import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Suspense, lazy, useEffect, useState } from "react";
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
import { SocialTradingProvider } from "@/contexts/SocialTradingContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import PublicInfoPage from "./pages/PublicInfoPage";
import PublicTournamentDetailPage from "./pages/PublicTournamentDetailPage";
import PublicTournamentsPage from "./pages/PublicTournamentsPage";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import ReviewsPage from "./pages/ReviewsPage";
import { applyPlatformSettingsToDocument, DEFAULT_PLATFORM_SETTINGS, type PlatformSettingsRecord } from "@/lib/platformMetadata";
import RouteSeoManager from "@/components/seo/RouteSeoManager";

const queryClient = new QueryClient();

const Trade = lazy(() => import("./pages/Trade"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Deposit = lazy(() => import("./pages/Deposit"));
const Withdraw = lazy(() => import("./pages/Withdraw"));
const Settings = lazy(() => import("./pages/Settings"));
const NotificationsPage = lazy(() => import("./pages/Notifications"));

const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const Finance = lazy(() => import("./pages/admin/Finance"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const TradeManagement = lazy(() => import("./pages/admin/TradeManagement"));
const AssetManagement = lazy(() => import("./pages/admin/AssetManagement"));
const PlatformSettings = lazy(() => import("./pages/admin/PlatformSettings"));
const PromoCodes = lazy(() => import("./pages/admin/PromoCodes"));
const RiskManagement = lazy(() => import("./pages/admin/RiskManagement"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const Notifications = lazy(() => import("./pages/admin/Notifications"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const CryptoPayments = lazy(() => import("./pages/admin/CryptoPayments"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const TournamentsAdmin = lazy(() => import("./pages/admin/TournamentsAdmin"));
const SupportInbox = lazy(() => import("./pages/admin/SupportInbox"));
const BlogAdmin = lazy(() => import("./pages/admin/BlogAdmin"));

const RouteLoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-center">
    <div className="max-w-md rounded-[28px] border border-border/60 bg-card/85 px-6 py-7 text-sm text-muted-foreground shadow-[0_18px_44px_rgba(8,15,28,0.18)] backdrop-blur-sm">
      Loading page...
    </div>
  </div>
);

const withRouteSuspense = (element: React.ReactElement) => (
  <Suspense fallback={<RouteLoadingScreen />}>{element}</Suspense>
);

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
                    <SocialTradingProvider>
                      <DynamicAssetProvider>
                        <TradingProvider>
                          <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/about" element={<PublicInfoPage pageKey="about" />} />
                        <Route path="/facts-and-figures" element={<PublicInfoPage pageKey="facts-and-figures" />} />
                        <Route path="/blog" element={<BlogPage />} />
                        <Route path="/blog/:slug" element={<BlogPostPage />} />
                        <Route path="/reviews" element={<ReviewsPage />} />
                        <Route path="/contact" element={<PublicInfoPage pageKey="contact" />} />
                        <Route path="/delete-account" element={<PublicInfoPage pageKey="delete-account" />} />
                        <Route path="/features" element={<PublicInfoPage pageKey="features" />} />
                        <Route path="/how-it-works" element={<PublicInfoPage pageKey="how-it-works" />} />
                        <Route path="/trading-guide" element={<PublicInfoPage pageKey="trading-guide" />} />
                        <Route path="/why-choose-init-option" element={<PublicInfoPage pageKey="why-choose-init-option" />} />
                        <Route path="/faq" element={<PublicInfoPage pageKey="faq" />} />
                        <Route path="/terms" element={<PublicInfoPage pageKey="terms" />} />
                        <Route path="/privacy" element={<PublicInfoPage pageKey="privacy" />} />
                        <Route path="/risk-disclaimer" element={<PublicInfoPage pageKey="risk-disclaimer" />} />
                        <Route path="/affiliate-program" element={<PublicInfoPage pageKey="affiliate-program" />} />
                        <Route path="/site-map" element={<PublicInfoPage pageKey="site-map" />} />
                        <Route path="/tournaments" element={<PublicTournamentsPage platformSettings={platformSettings} />} />
                        <Route
                          path="/tournaments/:slug"
                          element={<PublicTournamentDetailPage platformSettings={platformSettings} />}
                        />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/auth/callback" element={<AuthCallback />} />
                        <Route path="/dashboard" element={withRouteSuspense(<ProtectedRoute><Dashboard /></ProtectedRoute>)} />
                        <Route path="/trade" element={withRouteSuspense(<ProtectedRoute><Trade /></ProtectedRoute>)} />
                        <Route path="/trade/*" element={withRouteSuspense(<ProtectedRoute><Trade /></ProtectedRoute>)} />
                        <Route path="/deposit" element={withRouteSuspense(<ProtectedRoute><Deposit /></ProtectedRoute>)} />
                        <Route path="/withdraw" element={withRouteSuspense(<ProtectedRoute><Withdraw /></ProtectedRoute>)} />
                        <Route path="/settings" element={withRouteSuspense(<ProtectedRoute><Settings /></ProtectedRoute>)} />
                        <Route path="/notifications" element={withRouteSuspense(<ProtectedRoute><NotificationsPage /></ProtectedRoute>)} />
                        
                        {/* Admin Routes */}
                        <Route path="/admin" element={withRouteSuspense(<ProtectedRoute><AdminLayout /></ProtectedRoute>)}>
                          <Route index element={withRouteSuspense(<AdminDashboard />)} />
                          <Route path="dashboard" element={withRouteSuspense(<AdminDashboard />)} />
                          <Route path="blog" element={withRouteSuspense(<BlogAdmin />)} />
                          <Route path="support" element={withRouteSuspense(<SupportInbox />)} />
                          <Route path="users" element={withRouteSuspense(<UserManagement />)} />
                          <Route path="trades" element={withRouteSuspense(<TradeManagement />)} />
                          <Route path="finance" element={withRouteSuspense(<Finance />)} />
                          <Route path="assets" element={withRouteSuspense(<AssetManagement />)} />
                          <Route path="settings" element={withRouteSuspense(<PlatformSettings />)} />
                          <Route path="promos" element={withRouteSuspense(<PromoCodes />)} />
                          <Route path="risk" element={withRouteSuspense(<RiskManagement />)} />
                          <Route path="reports" element={withRouteSuspense(<Reports />)} />
                          <Route path="notifications" element={withRouteSuspense(<Notifications />)} />
                          <Route path="audit" element={withRouteSuspense(<AuditLogs />)} />
                          <Route path="admins" element={withRouteSuspense(<AdminUsers />)} />
                          <Route path="crypto-payments" element={withRouteSuspense(<CryptoPayments />)} />
                          <Route path="analytics" element={withRouteSuspense(<Analytics />)} />
                          <Route path="tournaments" element={withRouteSuspense(<TournamentsAdmin />)} />
                        </Route>

                        <Route path="*" element={<NotFound />} />
                          </Routes>
                        </TradingProvider>
                      </DynamicAssetProvider>
                    </SocialTradingProvider>
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
