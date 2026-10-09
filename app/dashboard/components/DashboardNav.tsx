"use client";

import { signOut } from "next-auth/react";
import { Scissors, ShieldCheck, Layers, LogOut, Factory, Activity } from "lucide-react";

interface NavProps {
  role: string;
  name: string;
}

const ROLE_CONFIG: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
  cutting_supervisor: {
    label: "Cutting Supervisor",
    badge: "text-blue-400 bg-blue-950/60 border-blue-500/30",
    icon: <Scissors className="w-3.5 h-3.5 text-blue-400" />,
  },
  cutting_verifier: {
    label: "Quality Verifier",
    badge: "text-emerald-400 bg-emerald-950/60 border-emerald-500/30",
    icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
  },
  sewing_supervisor: {
    label: "Sewing Floor Supervisor",
    badge: "text-purple-400 bg-purple-950/60 border-purple-500/30",
    icon: <Layers className="w-3.5 h-3.5 text-purple-400" />,
  },
};

export default function DashboardNav({ role, name }: NavProps) {
  const current = ROLE_CONFIG[role] || {
    label: role,
    badge: "text-slate-400 bg-slate-900 border-slate-700",
    icon: <Activity className="w-3.5 h-3.5 text-slate-400" />,
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-100 tracking-tight">ApparelFlow</span>
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                MES v1.0
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Cutting Operations & Verification Gatekeeper
            </div>
          </div>
        </div>

        {/* User Context & Sign Out */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Active Role Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${current.badge}`}>
            {current.icon}
            <div className="text-left leading-tight hidden sm:block">
              <div>{current.label}</div>
              <div className="text-[10px] opacity-75 font-mono">{name}</div>
            </div>
          </div>

          {/* Sign Out / Switch Role Button */}
          <button
            id="logout-btn"
            title="Sign out and switch role"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 hover:border-rose-800/50 border border-slate-800 rounded-lg transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out / Switch Role</span>
          </button>
        </div>
      </div>
    </header>
  );
}
