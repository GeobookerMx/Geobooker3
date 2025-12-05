// src/router.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";

// Layouts
import PublicLayout from "./components/layout/PublicLayout.jsx";
import DashboardLayout from "./components/layout/DashboardLayout.jsx";

// Auth Components
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

// Pages
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

export default function AppRouter() {
  return (
    <Routes>
      {/* Public Routes (No Auth Required) */}
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/faq" element={<FAQPage />} />

      {/* Protected Routes (Require Auth) */}
      <Route element={<ProtectedRoute><PublicLayout /></ProtectedRoute>}>
        <Route path="/" element={<HomePage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/business/register" element={<BusinessFormPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* User Dashboard (Protected) */}
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/business/:id/edit" element={<BusinessEditPage />} />
        <Route path="/dashboard/upgrade" element={<UpgradePage />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboardLayout />}>
        <Route path="dashboard" element={<DashboardHome />} />
        <Route path="businesses" element={<BusinessApprovals />} />
        <Route path="users" element={<div className="p-6"><h1 className="text-2xl font-bold">Gestión de Usuarios</h1><p className="text-gray-600 mt-2">Próximamente...</p></div>} />
        <Route path="ads" element={<AdsManagement />} />
        <Route path="analytics" element={<div className="p-6"><h1 className="text-2xl font-bold">Analytics</h1><p className="text-gray-600 mt-2">Próximamente...</p></div>} />
        <Route path="revenue" element={<div className="p-6"><h1 className="text-2xl font-bold">Ingresos</h1><p className="text-gray-600 mt-2">Próximamente...</p></div>} />
        <Route path="settings" element={<div className="p-6"><h1 className="text-2xl font-bold">Configuración</h1><p className="text-gray-600 mt-2">Próximamente...</p></div>} />
      </Route>
    </Routes>
  );
}
