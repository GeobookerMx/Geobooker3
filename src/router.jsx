// src/router.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";

// Layouts
import PublicLayout from "./components/layout/PublicLayout.jsx";
import DashboardLayout from "./components/layout/DashboardLayout.jsx";

// Admin
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminDashboardLayout from "./pages/admin/DashboardLayout.jsx";
import DashboardHome from "./pages/admin/DashboardHome.jsx";
import AdsManagement from "./pages/admin/AdsManagement.jsx";

// Pages
import HomePage from "./pages/HomePage.jsx";
import FAQPage from "./pages/FAQPage.jsx";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage.jsx";
import TermsOfServicePage from "./pages/TermsOfServicePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import BusinessFormPage from "./pages/BusinessFormPage.jsx";
import CategoriesPage from "./pages/CategoriesPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";

// Protected route
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";

export default function AppRouter() {
  return (
    <Routes>

      {/* Public Layout */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/business/register" element={<BusinessFormPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Dashboard protegido */}
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>

      {/* Admin Dashboard */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboardLayout />}>
        <Route path="dashboard" element={<DashboardHome />} />
        <Route path="businesses" element={<div className="p-6"><h1 className="text-2xl font-bold">Gestión de Negocios</h1><p className="text-gray-600 mt-2">Próximamente...</p></div>} />
        <Route path="users" element={<div className="p-6"><h1 className="text-2xl font-bold">Gestión de Usuarios</h1><p className="text-gray-600 mt-2">Próximamente...</p></div>} />
        <Route path="ads" element={<AdsManagement />} />
        <Route path="analytics" element={<div className="p-6"><h1 className="text-2xl font-bold">Analytics</h1><p className="text-gray-600 mt-2">Próximamente...</p></div>} />
        <Route path="revenue" element={<div className="p-6"><h1 className="text-2xl font-bold">Ingresos</h1><p className="text-gray-600 mt-2">Próximamente...</p></div>} />
        <Route path="settings" element={<div className="p-6"><h1 className="text-2xl font-bold">Configuración</h1><p className="text-gray-600 mt-2">Próximamente...</p></div>} />
      </Route>

    </Routes>
  );
}
