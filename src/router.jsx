// src/router.jsx
import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PageLoader from "./components/common/PageLoader";

// Layouts
import PublicLayout from "./components/layout/PublicLayout.jsx";
import DashboardLayout from "./components/layout/DashboardLayout.jsx";

// Auth - Lazy Loaded
const ProtectedRoute = lazy(() => import("./components/ProtectedRoute.jsx"));
const WelcomePage = lazy(() => import("./pages/WelcomePage.jsx"));
const SignupPage = lazy(() => import("./pages/SignupPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage.jsx"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage.jsx"));
const AuthCallback = lazy(() => import("./pages/AuthCallback.jsx"));

// Admin - Lazy Loaded (Heavy)
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin.jsx"));
const AdminDashboardLayout = lazy(() => import("./pages/admin/DashboardLayout.jsx"));
const DashboardHome = lazy(() => import("./pages/admin/DashboardHome.jsx"));
const AdsManagement = lazy(() => import("./pages/admin/AdsManagement.jsx"));
const BusinessApprovals = lazy(() => import("./pages/admin/BusinessApprovals.jsx"));
const RevenuePage = lazy(() => import("./pages/admin/RevenuePage.jsx"));
const AnalyticsPage = lazy(() => import("./pages/admin/AnalyticsPage.jsx"));
const UsersPage = lazy(() => import("./pages/admin/UsersPage.jsx"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage.jsx"));
const AdInventory = lazy(() => import("./pages/admin/AdInventory.jsx"));
const PostsManagement = lazy(() => import("./pages/admin/PostsManagement.jsx"));
const ScanInvitePage = lazy(() => import("./pages/admin/ScanInvitePage.jsx"));
const AdsQATool = lazy(() => import("./pages/admin/AdsQATool.jsx"));
const ReportsModeration = lazy(() => import("./pages/admin/ReportsModeration.jsx"));
const AdReportsModeration = lazy(() => import("./pages/admin/AdReportsModeration.jsx"));
const ReferralManagement = lazy(() => import("./pages/admin/ReferralManagement.jsx"));
const BulkImport = lazy(() => import("./pages/admin/BulkImport.jsx"));
const EmailCampaigns = lazy(() => import("./pages/admin/EmailCampaigns.jsx"));
const ContactsCRM = lazy(() => import("./pages/admin/ContactsCRM.jsx"));
const SmartCampaignLauncher = lazy(() => import("./pages/admin/SmartCampaignLauncher.jsx"));
const UnifiedCRM = lazy(() => import("./pages/admin/UnifiedCRM.jsx"));
const ApifyScraper = lazy(() => import("./pages/admin/ApifyScraper.jsx"));
const LeadsHistory = lazy(() => import("./pages/admin/LeadsHistory.jsx"));
const FiscalManagement = lazy(() => import("./pages/admin/FiscalManagement.jsx"));
const RecommendationsManagement = lazy(() => import("./pages/admin/RecommendationsManagement.jsx"));
const UnsubscribePage = lazy(() => import("./pages/UnsubscribePage.jsx"));

// User Pages - Lazy Loaded (except HomePage for LCP)
import HomePage from "./pages/HomePage.jsx"; // Static import for faster LCP
const FAQPage = lazy(() => import("./pages/FAQPage.jsx"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage.jsx"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage.jsx"));
const RegisterPage = lazy(() => import("./pages/RegisterPage.jsx"));
const BusinessFormPage = lazy(() => import("./pages/BusinessFormPage.jsx"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage.jsx"));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const BusinessEditPage = lazy(() => import("./pages/BusinessEditPage.jsx"));
const UpgradePage = lazy(() => import("./pages/UpgradePage.jsx"));

// Ads / Publicidad - Lazy Loaded
const AdvertisePage = lazy(() => import("./pages/AdvertisePage.jsx"));
const AdsPolicyPage = lazy(() => import("./pages/AdsPolicyPage.jsx"));
const AdvertiseSuccessPage = lazy(() => import("./pages/AdvertiseSuccessPage.jsx"));
const BillingPortal = lazy(() => import("./pages/BillingPortal.jsx"));
const CampaignCreateWizard = lazy(() => import("./pages/ad-wizard/CampaignCreateWizard.jsx"));

// Security - Lazy Loaded
const SecurityPage = lazy(() => import("./pages/SecurityPage.jsx"));

// Fiscal Info - Lazy Loaded
const FiscalInfoPage = lazy(() => import("./pages/FiscalInfoPage.jsx"));
const GuiaResicoPage = lazy(() => import("./pages/GuiaResicoPage.jsx"));

// Business Profile - Lazy Loaded
const BusinessProfilePage = lazy(() => import("./pages/BusinessProfilePage.jsx"));
const PlaceProfilePage = lazy(() => import("./pages/PlaceProfilePage.jsx"));

// Referral System - Lazy Loaded
const ReferralLanding = lazy(() => import("./pages/ReferralLanding.jsx"));
const DownloadPage = lazy(() => import("./pages/DownloadPage.jsx"));
const DeleteAccountPage = lazy(() => import("./pages/DeleteAccountPage.jsx"));

// Community Pages - Lazy Loaded
const AboutPage = lazy(() => import("./pages/AboutPage.jsx"));
const CommunityPage = lazy(() => import("./pages/CommunityPage.jsx"));
const AppDevelopmentPage = lazy(() => import("./pages/AppDevelopmentPage.jsx"));

// Enterprise / Global Ads - Lazy Loaded
const EnterpriseLanding = lazy(() => import("./pages/enterprise/EnterpriseLanding.jsx"));
const EnterpriseContact = lazy(() => import("./pages/enterprise/EnterpriseContact.jsx"));
const EnterpriseCheckout = lazy(() => import("./pages/enterprise/EnterpriseCheckout.jsx"));
const EnterpriseSuccess = lazy(() => import("./pages/enterprise/EnterpriseSuccess.jsx"));
const EnterpriseEdit = lazy(() => import("./pages/enterprise/EnterpriseEdit.jsx"));
const AdvertiserDashboard = lazy(() => import("./pages/advertiser/AdvertiserDashboard.jsx"));
const OxxoPendingPage = lazy(() => import("./pages/OxxoPendingPage.jsx"));

// International City Landing Pages
const CityLandingPage = lazy(() => import("./pages/cities/CityLandingPage.jsx"));

// English B2B Pages (International SEO)
const AdvertiseInMexicoPage = lazy(() => import("./pages/en/AdvertiseInMexicoPage.jsx"));
const EnPricingPage = lazy(() => import("./pages/en/PricingPage.jsx"));
const IndustriesPage = lazy(() => import("./pages/en/IndustriesPage.jsx"));

export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* 🔒 Callback de autenticación OAuth (sin layout) */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* 🌐 Rutas públicas que usan el layout general (Header + Footer) */}
        <Route element={<PublicLayout />}>
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/unsubscribe" element={<UnsubscribePage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="/faq" element={<FAQPage />} />

          {/* 🆕 Páginas públicas para acceso de invitados (con límite de búsqueda) */}
          <Route path="/" element={<HomePage />} />
          <Route path="/c/:category" element={<HomePage />} />
          <Route path="/c/:category/:subcategory" element={<HomePage />} />
          <Route path="/ciudad/:city" element={<HomePage />} />
          <Route path="/categories" element={<CategoriesPage />} />

          {/* 🌍 International City Landing Pages (SEO USA/UK/CA) */}
          <Route path="/cities/:citySlug" element={<CityLandingPage />} />

          {/* 🇬🇧 English B2B Landing Pages (International SEO) */}
          <Route path="/en/advertise-in-mexico" element={<AdvertiseInMexicoPage />} />
          <Route path="/en/pricing" element={<EnPricingPage />} />
          <Route path="/en/industries" element={<IndustriesPage />} />

          {/* Página comercial de publicidad (SIN login) */}
          <Route path="/advertise" element={<AdvertisePage />} />

          {/* Referral Landing Page */}
          <Route path="/r/:code" element={<ReferralLanding />} />

          {/* Download App Page - Para QR codes y campañas */}
          <Route path="/download" element={<DownloadPage />} />

          {/* Delete Account Page - Requerido por Google Play */}
          <Route path="/delete-account" element={<DeleteAccountPage />} />

          {/* Políticas de anuncios (página legal pública) */}
          <Route path="/legal/ads-policy" element={<AdsPolicyPage />} />

          {/* Página de seguridad y anti-extorsión */}
          <Route path="/seguridad" element={<SecurityPage />} />

          {/* Quiénes Somos / About Us */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/quienes-somos" element={<AboutPage />} />

          {/* Comunidad Geobooker */}
          <Route path="/comunidad" element={<CommunityPage />} />
          <Route path="/community" element={<CommunityPage />} />

          {/* Desarrollo de Apps - Cotización */}
          <Route path="/desarrollo-apps" element={<AppDevelopmentPage />} />

          {/* Información fiscal para usuarios internacionales */}
          <Route path="/legal/fiscal" element={<FiscalInfoPage />} />

          {/* Guía para darse de alta en el SAT como RESICO */}
          <Route path="/guia-resico" element={<GuiaResicoPage />} />

          {/* Página de pago OXXO pendiente */}
          <Route path="/payment/oxxo-pending" element={<OxxoPendingPage />} />

          {/* Enterprise / Global Ads */}
          <Route path="/enterprise" element={<EnterpriseLanding />} />
          <Route path="/enterprise/contact" element={<EnterpriseContact />} />
          <Route path="/enterprise/checkout" element={<EnterpriseCheckout />} />
          <Route path="/enterprise/success" element={<EnterpriseSuccess />} />
          <Route path="/enterprise/edit/:id" element={<EnterpriseEdit />} />

          {/* Advertiser Dashboard */}
          <Route path="/advertiser/dashboard" element={<AdvertiserDashboard />} />

          {/* Perfil público de negocio */}
          <Route path="/business" element={<Navigate to="/" replace />} />
          <Route path="/business/:id" element={<BusinessProfilePage />} />

          {/* Perfil de negocio de Google Places */}
          <Route path="/place/:placeId" element={<PlaceProfilePage />} />
        </Route>

        {/* 🔐 Rutas protegidas (requieren login) */}
        <Route
          element={
            <ProtectedRoute>
              <PublicLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/business/register" element={<BusinessFormPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>


        {/* 📊 Dashboard de usuario (layout tipo panel) */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/dashboard/business/:id/edit"
            element={<BusinessEditPage />}
          />
          <Route path="/dashboard/upgrade" element={<UpgradePage />} />

          {/* Wizard de creación de campañas (Protegido, dentro del dashboard) */}
          <Route path="/advertise/create" element={<CampaignCreateWizard />} />
          <Route path="/advertise/success" element={<AdvertiseSuccessPage />} />
          <Route path="/dashboard/billing" element={<BillingPortal />} />
        </Route>

        {/* 🛠️ Rutas de administrador */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboardLayout />}>
          <Route path="dashboard" element={<DashboardHome />} />
          <Route path="businesses" element={<BusinessApprovals />} />

          <Route path="users" element={<UsersPage />} />

          <Route path="ads" element={<AdsManagement />} />

          <Route path="ads-qa" element={<AdsQATool />} />

          <Route path="reports" element={<ReportsModeration />} />

          <Route path="ad-reports" element={<AdReportsModeration />} />

          <Route path="analytics" element={<AnalyticsPage />} />

          <Route path="revenue" element={<RevenuePage />} />

          <Route path="inventory" element={<AdInventory />} />

          <Route path="blog" element={<PostsManagement />} />

          <Route path="scan-invite" element={<ScanInvitePage />} />

          <Route path="settings" element={<SettingsPage />} />
          <Route path="referrals" element={<ReferralManagement />} />
          <Route path="import" element={<BulkImport />} />
          <Route path="campaigns" element={<UnifiedCRM />} />
          <Route path="crm" element={<UnifiedCRM />} />
          <Route path="marketing" element={<UnifiedCRM />} />
          <Route path="smart-campaigns" element={<SmartCampaignLauncher />} />
          <Route path="scraper" element={<ApifyScraper />} />
          <Route path="scraper-history" element={<LeadsHistory />} />
          <Route path="fiscal" element={<FiscalManagement />} />
          <Route path="recommendations" element={<RecommendationsManagement />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
