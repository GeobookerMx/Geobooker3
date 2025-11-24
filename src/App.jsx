// src/App.jsx
import React from "react";
import { BrowserRouter } from "react-router-dom";

import { AppProvider } from "./contexts/AppContext";
import { AuthProvider } from "./contexts/AuthContext";
import { LocationProvider } from "./contexts/LocationContext";

import AppRouter from "./router";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <LocationProvider>
            <AppRouter />
          </LocationProvider>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
