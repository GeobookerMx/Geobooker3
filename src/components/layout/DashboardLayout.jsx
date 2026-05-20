import React from "react";
import { Outlet } from "react-router-dom";
import UserSidebar from "./UserSidebar";
import { Capacitor } from "@capacitor/core";

export default function DashboardLayout() {
  const isNative = Capacitor.isNativePlatform();
  return (
    <div className="flex min-h-screen bg-gray-50" style={isNative ? { paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' } : {}}>
      <UserSidebar />

      <main className="flex-1 overflow-y-auto" style={isNative ? { padding: '16px 16px calc(16px + env(safe-area-inset-bottom)) 16px' } : { padding: '32px' }}>
        <Outlet />
      </main>
    </div>
  );
}
