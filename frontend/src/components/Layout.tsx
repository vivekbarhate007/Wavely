import { NavLink } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
import { isDemoMode, fetchStats } from "../api/client";

const NAV = [
  { to: "/",        label: "Overview", end: true  },
  { to: "/posts",   label: "Posts",    end: false },
  { to: "/topics",  label: "Topics",   end: false },
  { to: "/alerts",  label: "Alerts",   end: false },
  { to: "/digest",  label: "Digest",   end: false },
];

export default function Layout({ children }: { children: ReactNode }) {
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    fetchStats().then(() => setDemo(isDemoMode));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Top navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-8 h-14">

          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-900 tracking-tight">
              Wave<span className="text-orange-500">ly</span>
            </span>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-orange-50 text-orange-600 font-semibold"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            {demo && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Demo Mode
              </span>
            )}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Groq + LangGraph
            </div>
          </div>
        </div>

        {/* Demo banner */}
        {demo && (
          <div className="bg-amber-50 border-t border-amber-200 px-6 py-2 flex items-center gap-3">
            <span className="text-xs text-amber-700">
              Backend not connected — showing sample data.
            </span>
            <span className="text-xs text-amber-600">
              Run <code className="bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded font-mono">docker compose up -d</code> inside <code className="bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded font-mono">Wavely/</code> then add your API keys to <code className="bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded font-mono">.env</code>
            </span>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  );
}
