// src/router.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";

// Layouts
import PublicLayout from "./components/layout/PublicLayout.jsx";
import DashboardLayout from "./components/layout/DashboardLayout.jsx";

// Auth
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import WelcomePage from "./pages/WelcomePage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";

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
import CampaignCreateWizard from "./pages/ad-wizard/CampaignCreateWizard.jsx";

export default function AppRouter() {
  return (
    <Routes>
      {/* 🌐 Rutas públicas que usan el layout general (Header + Footer) */}
      <Route element={<PublicLayout />}>
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/faq" element={<FAQPage />} />

        {/* Página comercial de publicidad (SIN login) */}
        <Route path="/advertise" element={<AdvertisePage />} />

        {/* Políticas de anuncios (página legal pública) */}
        <Route path="/legal/ads-policy" element={<AdsPolicyPage />} />
      </Route>

      {/* 🔐 Rutas protegidas que usan el mismo layout público */}
      <Route
        element={
          <ProtectedRoute>
            <PublicLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/categories" element={<CategoriesPage />} />
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
      </Route>

      {/* 🛠️ Rutas de administrador */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboardLayout />}>
        <Route path="dashboard" element={<DashboardHome />} />
        <Route path="businesses" element={<BusinessApprovals />} />

        <Route path="users" element={<UsersPage />} />

        <Route path="ads" element={<AdsManagement />} />

        <Route path="analytics" element={<AnalyticsPage />} />

        <Route path="revenue" element={<RevenuePage />} />

        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
