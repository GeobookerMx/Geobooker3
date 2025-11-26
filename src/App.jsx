// src/App.jsx
import React from "react";
import { BrowserRouter } from "react-router-dom";

import { AppProvider } from "./contexts/AppContext";
import { AuthProvider } from "./contexts/AuthContext";
import { LocationProvider } from "./contexts/LocationContext";

import AppRouter from "./router";
import Header from "./components/layout/Header"; // ← agregamos un Header global opcional

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <LocationProvider>

            {/* 🔵 Header global con tu logo */}
            <Header />

            {/* 🔵 Todas las rutas de la app */}
            <AppRouter />

          </LocationProvider>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
