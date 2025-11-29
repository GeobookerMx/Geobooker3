// src/components/layout/PublicLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";   // ← ESTE ES EL FIX IMPORTANTE
import Footer from "./Footer";   // si tienes footer

export default function PublicLayout() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
