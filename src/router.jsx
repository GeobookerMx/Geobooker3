// src/router.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layouts
import PublicLayout from "./components/layout/PublicLayout.jsx";
import DashboardLayout from "./components/layout/DashboardLayout.jsx";

// Auth
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import WelcomePage from "./pages/WelcomePage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import AuthCallback from "./pages/AuthCallback.jsx";

// Admin
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminDashboardLayout from "./pages/admin/DashboardLayout.jsx";
import DashboardHome from "./pages/admin/DashboardHome.jsx";
import AdsManagement from "./pages/admin/AdsManagement.jsx";
import BusinessApprovals from "./pages/admin/BusinessApprovals.jsx";
import RevenuePage from "./pages/admin/RevenuePage.jsx";
import AnalyticsPage from "./pages/admin/AnalyticsPage.jsx";
import UsersPage from "./pages/admin/UsersPage.jsx";
import SettingsPage from "./pages/admin/SettingsPage.jsx";
import AdInventory from "./pages/admin/AdInventory.jsx";
import PostsManagement from "./pages/admin/PostsManagement.jsx";
import ScanInvitePage from "./pages/admin/ScanInvitePage.jsx";
import AdsQATool from "./pages/admin/AdsQATool.jsx";
import ReportsModeration from "./pages/admin/ReportsModeration.jsx";
import AdReportsModeration from "./pages/admin/AdReportsModeration.jsx";

// User Pages
import HomePage from "./pages/HomePage.jsx";
import FAQPage from "./pages/FAQPage.jsx";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage.jsx";
import TermsOfServicePage from "./pages/TermsOfServicePage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import BusinessFormPage from "./pages/BusinessFormPage.jsx";
import CategoriesPage from "./pages/CategoriesPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import BusinessEditPage from "./pages/BusinessEditPage.jsx";
import UpgradePage from "./pages/UpgradePage.jsx";

// Ads / Publicidad
import AdvertisePage from "./pages/AdvertisePage.jsx";
import AdsPolicyPage from "./pages/AdsPolicyPage.jsx";
import AdvertiseSuccessPage from "./pages/AdvertiseSuccessPage.jsx";
import CampaignCreateWizard from "./pages/ad-wizard/CampaignCreateWizard.jsx";

// Security
import SecurityPage from "./pages/SecurityPage.jsx";

// Fiscal Info
import FiscalInfoPage from "./pages/FiscalInfoPage.jsx";
import GuiaResicoPage from "./pages/GuiaResicoPage.jsx";

// Business Profile
import BusinessProfilePage from "./pages/BusinessProfilePage.jsx";
import PlaceProfilePage from "./pages/PlaceProfilePage.jsx";

// Referral System
import ReferralLanding from "./pages/ReferralLanding.jsx";

// Community Pages
import AboutPage from "./pages/AboutPage.jsx";
import CommunityPage from "./pages/CommunityPage.jsx";
import AppDevelopmentPage from "./pages/AppDevelopmentPage.jsx";

// Enterprise / Global Ads
import EnterpriseLanding from "./pages/enterprise/EnterpriseLanding.jsx";
import EnterpriseContact from "./pages/enterprise/EnterpriseContact.jsx";
import EnterpriseCheckout from "./pages/enterprise/EnterpriseCheckout.jsx";
import EnterpriseSuccess from "./pages/enterprise/EnterpriseSuccess.jsx";
import EnterpriseEdit from "./pages/enterprise/EnterpriseEdit.jsx";
import AdvertiserDashboard from "./pages/advertiser/AdvertiserDashboard.jsx";

export default function AppRouter() {
  return (
    <Routes>
      {/* 🔒 Callback de autenticación OAuth (sin layout) */}
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* 🌐 Rutas públicas que usan el layout general (Header + Footer) */}
      <Route element={<PublicLayout />}>
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/faq" element={<FAQPage />} />

        {/* 🆕 Páginas públicas para acceso de invitados (con límite de búsqueda) */}
        <Route path="/" element={<HomePage />} />
        <Route path="/categories" element={<CategoriesPage />} />

        {/* Página comercial de publicidad (SIN login) */}
        <Route path="/advertise" element={<AdvertisePage />} />

        {/* Referral Landing Page */}
        <Route path="/r/:code" element={<ReferralLanding />} />

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
      </Route>
    </Routes>
  );
}
