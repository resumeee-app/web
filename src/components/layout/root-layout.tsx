import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./header";

export const RootLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 focus:outline-none"
      >
        <Outlet />
      </main>
      <footer
        role="contentinfo"
        className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Resumeee. Pure Client-Side SPA Architecture.</p>
        </div>
      </footer>
    </div>
  );
};
