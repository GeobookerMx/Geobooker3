// src/App.jsx
import React, { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";

import { AppProvider } from "./contexts/AppContext";
import { AuthProvider } from "./contexts/AuthContext";
import { LocationProvider } from "./contexts/LocationContext";
import { useSessionTimeout } from "./hooks/useSessionTimeout";
import { initializeGA4, trackSessionStart } from "./services/analyticsService";

import AppRouter from "./router";
import ChatWidget from "./components/agent/ChatWidget";

// Component to activate session timeout monitoring
function SessionTimeoutMonitor() {
  useSessionTimeout();
  return null;
}

// Component to initialize analytics
function AnalyticsInitializer() {
  useEffect(() => {
    initializeGA4();
    trackSessionStart(false); // Will be updated when auth state changes
  }, []);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SessionTimeoutMonitor />
        <AnalyticsInitializer />
        <AppProvider>
          <LocationProvider>
            <AppRouter />
            {/* Asistente AI flotante */}
            <ChatWidget />
          </LocationProvider>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
