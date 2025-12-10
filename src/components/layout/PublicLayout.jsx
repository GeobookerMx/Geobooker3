// src/components/layout/PublicLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import LocationPrompt from "../LocationPrompt";

export default function PublicLayout() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <Outlet />
      </main>
      <Footer />

      {/* Prompt de ubicación para móviles */}
      <LocationPrompt />
    </>
  );
}
