// src/router.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";

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

// Protected route (optional)
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";

export default function AppRouter() {
  return (
    <Routes>

      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/categories" element={<CategoriesPage />} />
      <Route path="/business/register" element={<BusinessFormPage />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Private dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

    </Routes>
  );
}
