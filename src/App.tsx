import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Suspense, lazy, useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SafeAppwriteProvider from "@/integrations/appwrite/AppwriteProvider";
import TradingRouteProviders from "@/components/TradingRouteProviders";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { applyPlatformSettingsToDocument, DEFAULT_PLATFORM_SETTINGS, type PlatformSettingsRecord } from "@/lib/platformMetadata";
import { readPlatformPresentationCache, writePlatformPresentationCache } from "@/lib/platformSettingsCache";
import RouteSeoManager from "@/components/seo/RouteSeoManager";

const queryClient = new QueryClient();

const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Forgot = lazy(() => import("./pages/Forgot"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PublicInfoPage = lazy(() => import("./pages/PublicInfoPage"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const InformationDisclosure = lazy(() => import("./pages/InformationDisclosure"));
const PublicTournamentDetailPage = lazy(() => import("./pages/PublicTournamentDetailPage"));
const TournamentsPage = lazy(() => import("./pages/TournamentsPage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));
const ReviewsPage = lazy(() => import("./pages/ReviewsPage"));
const TradingGuidePage = lazy(() => import("./pages/TradingGuidePage"));
const GuideBrowserPage = lazy(() => import("./pages/GuideBrowserPage"));
const Trade = lazy(() => import("./pages/Trade"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Deposit = lazy(() => import("./pages/Deposit"));
const DepositModalPage = lazy(() => import("./pages/DepositModalPage"));
const Withdraw = lazy(() => import("./pages/Withdraw"));
const PaymentCenter = lazy(() => import("./components/payment/PaymentCenter"));
const Settings = lazy(() => import("./pages/Settings"));
const NotificationsPage = lazy(() => import("./pages/Notifications"));
const TraderProfile = lazy(() => import("./pages/TraderProfile"));
const SocialTopTraders = lazy(() => import("./pages/SocialTopTraders"));
const MyCopiedTraders = lazy(() => import("./pages/MyCopiedTraders"));
const Referrals = lazy(() => import("./pages/Referrals"));

const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const Finance = lazy(() => import("./pages/admin/Finance"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const TradeManagement = lazy(() => import("./pages/admin/TradeManagement"));
const AssetManagement = lazy(() => import("./pages/admin/AssetManagement"));
const PlatformSettings = lazy(() => import("./pages/admin/PlatformSettings"));
const PromoCodes = lazy(() => import("./pages/admin/PromoCodes"));
const PromoMaterials = lazy(() => import("./pages/admin/PromoMaterials"));
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
const GuideAdmin = lazy(() => import("./pages/admin/GuideAdmin"));
const GuideMediaAdmin = lazy(() => import("./pages/admin/GuideMediaAdmin"));
const FundsManager = lazy(() => import("./pages/admin/FundsManager"));
const UserActivity = lazy(() => import("./pages/admin/UserActivity"));

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

const withProtectedRoute = (element: React.ReactElement) => withRouteSuspense(
  <ProtectedRoute>{element}</ProtectedRoute>,
);

const withTradingRoute = (element: React.ReactElement) => withRouteSuspense(
  <ProtectedRoute>
    <TradingRouteProviders>{element}</TradingRouteProviders>
  </ProtectedRoute>,
);

const App = () => {
  const [platformSettings, setPlatformSettings] = useState<Partial<PlatformSettingsRecord> | null>(
    DEFAULT_PLATFORM_SETTINGS,
  );

  // Import apiFetch here to avoid circular dependency issues
  const apiFetch = async (path: string): Promise<unknown> => {
    const res = await fetch(`/api${path}`);
    const payload = await res.json().catch(() => ({}));
    return payload.data ?? payload;
  };

  useEffect(() => {
    async function loadPlatformPresentation() {
      const cachedSettings = readPlatformPresentationCache();
      if (cachedSettings) {
        setPlatformSettings(cachedSettings);
        applyPlatformSettingsToDocument(cachedSettings);
        return;
      }

      try {
        const data = await apiFetch("/platform-settings/public");
        const resolvedSettings = (data as Partial<PlatformSettingsRecord> | null) ?? DEFAULT_PLATFORM_SETTINGS;
        writePlatformPresentationCache(resolvedSettings);
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

  // Keep platformSettings in sync after admin saves so RouteSeoManager
  // doesn't re-apply stale settings (which would wipe new logo keys).
  useEffect(() => {
    const onBrandUpdated = () => {
      const cachedSettings = readPlatformPresentationCache();
      if (cachedSettings) {
        setPlatformSettings(cachedSettings);
      }
    };
    window.addEventListener("brand_updated", onBrandUpdated);
    return () => window.removeEventListener("brand_updated", onBrandUpdated);
  }, []);

  return (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
         <BrowserRouter>
           <RouteSeoManager platformSettings={platformSettings} />
           <SafeAppwriteProvider>
             <Routes>
                        <Route path="/" element={withRouteSuspense(<Index />)} />
                        <Route path="/about" element={withRouteSuspense(<PublicInfoPage pageKey="about" />)} />
                        <Route path="/facts-and-figures" element={withRouteSuspense(<PublicInfoPage pageKey="facts-and-figures" />)} />
                        <Route path="/blog" element={withRouteSuspense(<BlogPage />)} />
                        <Route path="/blog/:slug" element={withRouteSuspense(<BlogPostPage />)} />
                        <Route path="/reviews" element={withRouteSuspense(<ReviewsPage />)} />
                        <Route path="/contact" element={withRouteSuspense(<PublicInfoPage pageKey="contact" />)} />
                        <Route path="/delete-account" element={withRouteSuspense(<PublicInfoPage pageKey="delete-account" />)} />
                        <Route path="/features" element={withRouteSuspense(<PublicInfoPage pageKey="features" />)} />
                        <Route path="/how-it-works" element={withRouteSuspense(<PublicInfoPage pageKey="how-it-works" />)} />
                        <Route path="/trading-guide" element={withRouteSuspense(<TradingGuidePage />)} />
                        <Route path="/guides" element={withRouteSuspense(<GuideBrowserPage />)} />
                        <Route path="/guides/:category/:slug" element={withRouteSuspense(<GuideBrowserPage />)} />
                        <Route path="/why-choose-init-option" element={withRouteSuspense(<PublicInfoPage pageKey="why-choose-init-option" />)} />
                        <Route path="/faq" element={withRouteSuspense(<PublicInfoPage pageKey="faq" />)} />
                        <Route path="/terms" element={withRouteSuspense(<TermsAndConditions />)} />
                        <Route path="/information-disclosure" element={withRouteSuspense(<InformationDisclosure />)} />
                        <Route path="/privacy" element={withRouteSuspense(<PublicInfoPage pageKey="privacy" />)} />
                        <Route path="/aml-kyc" element={withRouteSuspense(<PublicInfoPage pageKey="aml-kyc" />)} />
                        <Route path="/payment-policy" element={withRouteSuspense(<PublicInfoPage pageKey="payment-policy" />)} />
                        <Route path="/risk-disclaimer" element={withRouteSuspense(<PublicInfoPage pageKey="risk-disclaimer" />)} />
                        <Route path="/affiliate-program" element={withRouteSuspense(<PublicInfoPage pageKey="affiliate-program" />)} />
                        <Route path="/regulation" element={withRouteSuspense(<PublicInfoPage pageKey="regulation" />)} />
                        <Route path="/for-partners" element={withRouteSuspense(<PublicInfoPage pageKey="for-partners" />)} />
                        <Route path="/site-map" element={withRouteSuspense(<PublicInfoPage pageKey="site-map" />)} />
                        <Route path="/traders/:username" element={withRouteSuspense(<TraderProfile />)} />
                        <Route path="/tournaments" element={withRouteSuspense(<TournamentsPage />)} />
                        <Route
                          path="/tournaments/:slug"
                          element={withRouteSuspense(<PublicTournamentDetailPage platformSettings={platformSettings} />)}
                        />
                        <Route path="/login" element={withRouteSuspense(<Login />)} />
                        <Route path="/register" element={withRouteSuspense(<Register />)} />
                        <Route path="/forgot" element={withRouteSuspense(<Forgot />)} />
                        <Route path="/auth/callback" element={withRouteSuspense(<AuthCallback />)} />
                        <Route path="/dashboard" element={withTradingRoute(<Dashboard />)} />
                        <Route path="/trade" element={withTradingRoute(<Trade />)} />
                        <Route path="/trade/*" element={withTradingRoute(<Trade />)} />
                        <Route path="/deposit" element={withTradingRoute(<DepositModalPage />)} />
                        <Route path="/withdraw" element={withTradingRoute(<PaymentCenter defaultTab="withdraw" />)} />
                        <Route path="/settings" element={withTradingRoute(<Settings />)} />
                        <Route path="/notifications" element={withTradingRoute(<NotificationsPage />)} />
                        <Route path="/social/traders" element={withTradingRoute(<SocialTopTraders />)} />
                        <Route path="/social/my-copies" element={withTradingRoute(<MyCopiedTraders />)} />
                        <Route path="/referrals" element={withTradingRoute(<Referrals />)} />
                        
                        {/* Admin Routes */}
                        <Route path="/admin" element={withProtectedRoute(<AdminLayout />)}>
                          <Route index element={withRouteSuspense(<AdminDashboard />)} />
                          <Route path="dashboard" element={withRouteSuspense(<AdminDashboard />)} />
                          <Route path="blog" element={withRouteSuspense(<BlogAdmin />)} />
                          <Route path="support" element={withRouteSuspense(<SupportInbox />)} />
                          <Route path="users" element={withRouteSuspense(<UserManagement />)} />
                          <Route path="trades" element={withRouteSuspense(<TradeManagement />)} />
                          <Route path="finance" element={withRouteSuspense(<Finance />)} />
                          <Route path="funds" element={withRouteSuspense(<FundsManager />)} />
                          <Route path="user-activity" element={withRouteSuspense(<UserActivity />)} />
                          <Route path="assets" element={withRouteSuspense(<AssetManagement />)} />
                          <Route path="settings" element={withRouteSuspense(<PlatformSettings />)} />
                          <Route path="promo-materials" element={withRouteSuspense(<PromoMaterials />)} />
                          <Route path="promos" element={withRouteSuspense(<PromoCodes />)} />
                          <Route path="risk" element={withRouteSuspense(<RiskManagement />)} />
                          <Route path="reports" element={withRouteSuspense(<Reports />)} />
                          <Route path="notifications" element={withRouteSuspense(<Notifications />)} />
                          <Route path="audit" element={withRouteSuspense(<AuditLogs />)} />
                          <Route path="admins" element={withRouteSuspense(<AdminUsers />)} />
                          <Route path="crypto-payments" element={withRouteSuspense(<CryptoPayments />)} />
                          <Route path="analytics" element={withRouteSuspense(<Analytics />)} />
                          <Route path="tournaments" element={withRouteSuspense(<TournamentsAdmin />)} />
                          <Route path="guides" element={withRouteSuspense(<GuideAdmin />)} />
                          <Route path="guides/media" element={withRouteSuspense(<GuideMediaAdmin />)} />
                        </Route>

                        <Route path="*" element={withRouteSuspense(<NotFound />)} />
             </Routes>
           </SafeAppwriteProvider>
         </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
  );
};

export default App;
