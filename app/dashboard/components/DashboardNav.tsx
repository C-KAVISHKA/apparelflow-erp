"use client";

import { signOut } from "next-auth/react";
import { Scissors, ShieldCheck, Layers, LogOut, Factory, Activity } from "lucide-react";

interface NavProps {
  role: string;
  name: string;
}

const ROLE_META: Record<string, { label: string; badgeColor: string; icon: React.ReactNode; ringColor: string }> = {
  cutting_supervisor: {
    label: "Cutting Supervisor",
    badgeColor: "text-blue-400 bg-blue-950/60 border-blue-500/30",
    ringColor: "bg-blue-500",
    icon: <Scissors className="w-3.5 h-3.5 text-blue-400" />,
  },
  cutting_verifier: {
    label: "Quality Verifier",
    badgeColor: "text-emerald-400 bg-emerald-950/60 border-emerald-500/30",
    ringColor: "bg-emerald-500",
    icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
  },
  sewing_supervisor: {
    label: "Sewing Floor Supervisor",
    badgeColor: "text-purple-400 bg-purple-950/60 border-purple-500/30",
    ringColor: "bg-purple-500",
    icon: <Layers className="w-3.5 h-3.5 text-purple-400" />,
  },
};

export default function DashboardNav({ role, name }: NavProps) {
  const meta = ROLE_META[role] || {
    label: role,
    badgeColor: "text-slate-400 bg-slate-900 border-slate-700",
    ringColor: "bg-slate-500",
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
            <div className="text-[11px] text-slate-400 font-medium">Cutting & Verification Gatekeeper</div>
          </div>
        </div>

        {/* User context & actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Active Persona Badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${meta.badgeColor}`}>
            {meta.icon}
            <div className="text-left leading-tight hidden sm:block">
              <div className="text-xs font-semibold">{meta.label}</div>
              <div className="text-[10px] opacity-75 font-mono">{name}</div>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            id="logout-btn"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 hover:border-rose-800/50 border border-slate-800 rounded-md transition-all duration-150 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
