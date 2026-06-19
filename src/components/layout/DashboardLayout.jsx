import React from "react";
import { Outlet } from "react-router-dom";
import UserSidebar from "./UserSidebar";
import { Capacitor } from "@capacitor/core";

export default function DashboardLayout() {
  const isNative = Capacitor.isNativePlatform();
  return (
    <div className="flex min-h-screen overflow-x-hidden bg-gray-50" style={isNative ? { paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' } : {}}>
      <UserSidebar />

      <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto" style={isNative ? { padding: '16px 12px calc(16px + env(safe-area-inset-bottom)) 12px' } : { padding: '24px' }}>
        {/* Spacer for mobile top bar (only on screens smaller than md) */}
        <div className="md:hidden" style={{ height: 'calc(56px + env(safe-area-inset-top))' }} />
        <div className="mx-auto w-full max-w-[1400px] min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
