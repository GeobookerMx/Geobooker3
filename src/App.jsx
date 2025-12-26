// src/App.jsx
import React from "react";
import { BrowserRouter } from "react-router-dom";

import { AppProvider } from "./contexts/AppContext";
import { AuthProvider } from "./contexts/AuthContext";
import { LocationProvider } from "./contexts/LocationContext";
import { useSessionTimeout } from "./hooks/useSessionTimeout";

import AppRouter from "./router";
import ChatWidget from "./components/agent/ChatWidget";

// Component to activate session timeout monitoring
function SessionTimeoutMonitor() {
  useSessionTimeout();
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SessionTimeoutMonitor />
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
