// src/components/layout/PublicLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import { usePageTracking } from "../../hooks/usePageTracking";

export default function PublicLayout() {
  // Track page views automatically
  usePageTracking();

  // Apple 5.1.1(iv) compliance: el permiso de ubicación se solicita ÚNICAMENTE
  // a través del system prompt nativo (NSLocationWhenInUseUsageDescription).
  // El modal contextual vive solo en HomePage (LocationPermissionModal),
  // sin botón de "Omitir/Skip" para no demorar el system prompt.
  return (
    <>
      <Header />
      <main className="min-h-screen overflow-x-hidden bg-white">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
