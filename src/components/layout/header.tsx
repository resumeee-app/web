import React from "react";
import { Link, NavLink } from "react-router-dom";
import { FileText, Cpu, User, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-200 bg-white">
      {/* Accessible skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-indigo-600 focus:text-white focus:outline-none"
      >
        Skip to main content
      </a>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-8">
          <Link
            to="/"
            className="flex items-center space-x-2 text-xl font-bold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md"
            aria-label="Resumeee Home"
          >
            <FileText className="h-6 w-6 text-indigo-600" aria-hidden="true" />
            <span>Resumeee</span>
          </Link>

          <nav
            aria-label="Main Navigation"
            className="hidden md:flex md:space-x-4"
          >
            <NavLink
              to="/"
              className={({ isActive }) =>
                cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                  isActive
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )
              }
              end
            >
              Resumes
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 flex items-center space-x-1",
                  isActive
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )
              }
            >
              <User className="h-4 w-4" aria-hidden="true" />
              <span>Master Profile</span>
            </NavLink>
            <NavLink
              to="/models"
              className={({ isActive }) =>
                cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 flex items-center space-x-1",
                  isActive
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )
              }
            >
              <Cpu className="h-4 w-4" aria-hidden="true" />
              <span>AI Models</span>
            </NavLink>
            <NavLink
              to="/templates"
              className={({ isActive }) =>
                cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 flex items-center space-x-1",
                  isActive
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )
              }
            >
              <Layers className="h-4 w-4" aria-hidden="true" />
              <span>Templates</span>
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
            SPA Ready
          </span>
        </div>
      </div>
    </header>
  );
};
