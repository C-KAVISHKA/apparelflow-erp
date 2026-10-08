"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Scissors, ShieldCheck, Layers, Factory, ArrowRight, AlertCircle, Lock, Mail, CheckCircle2 } from "lucide-react";

const DEMO_PERSONAS = [
  {
    roleId: "demo-cutting-supervisor",
    roleName: "Cutting Supervisor",
    email: "supervisor@apparelflow.com",
    password: "Password123!",
    badge: "Operations",
    description: "Create cutting batches, log fabric yardage & monitor lay progress",
    icon: Scissors,
    theme: "border-blue-500/30 hover:border-blue-500/60 bg-blue-950/20 text-blue-400",
    badgeTheme: "bg-blue-900/40 text-blue-300 border-blue-700/50",
  },
  {
    roleId: "demo-cutting-verifier",
    roleName: "Gatekeeper Verifier",
    email: "verifier@apparelflow.com",
    password: "Password123!",
    badge: "Quality Control",
    description: "Component-by-component QC counting, approve/reject gatekeeper enforcement",
    icon: ShieldCheck,
    theme: "border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-950/20 text-emerald-400",
    badgeTheme: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
  },
  {
    roleId: "demo-sewing-supervisor",
    roleName: "Sewing Floor Supervisor",
    email: "sewing@apparelflow.com",
    password: "Password123!",
    badge: "Assembly Floor",
    description: "Receive verified cut bundles, inspect audit notes & initiate sewing lines",
    icon: Layers,
    theme: "border-purple-500/30 hover:border-purple-500/60 bg-purple-950/20 text-purple-400",
    badgeTheme: "bg-purple-900/40 text-purple-300 border-purple-700/50",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent, customCreds?: { email: string; password: string }) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const targetEmail = customCreds?.email || email;
    const targetPassword = customCreds?.password || password;

    if (!targetEmail || !targetPassword) {
      setError("Please provide both email and password.");
      setLoading(false);
      return;
    }

    const res = await signIn("credentials", {
      email: targetEmail,
      password: targetPassword,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError("Authentication failed. Invalid email or password.");
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-400 mb-4 shadow-sm shadow-blue-500/10">
          <Factory className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">ApparelFlow ERP</h1>
        <p className="mt-1 text-sm text-slate-400">Cutting Operations & Gatekeeper Verification Terminal</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl shadow-xl overflow-hidden backdrop-blur-sm">
          {/* Quick Demo Switcher */}
          <div className="p-6 border-b border-slate-800/80 bg-slate-950/40">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                Evaluation Demo Personas
              </span>
              <span className="text-[11px] text-slate-400">Click card to authenticate</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DEMO_PERSONAS.map((persona) => {
                const Icon = persona.icon;
                const isSelected = activePreset === persona.email;
                return (
                  <button
                    key={persona.roleName}
                    id={persona.roleId}
                    type="button"
                    title={`Click to authenticate as ${persona.roleName} (${persona.email})`}
                    onClick={(e) => {
                      setActivePreset(persona.email);
                      setEmail(persona.email);
                      setPassword(persona.password);
                      handleLogin(e, { email: persona.email, password: persona.password });
                    }}
                    className={`flex flex-col text-left p-3.5 rounded-lg border transition-all duration-150 cursor-pointer relative group ${
                      isSelected
                        ? "border-blue-500 bg-blue-950/40 ring-1 ring-blue-500/50"
                        : `${persona.theme}`
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icon className="w-4 h-4" />
                      <span className={`text-[10px] font-medium font-mono px-1.5 py-0.5 rounded border ${persona.badgeTheme}`}>
                        {persona.badge}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-200">{persona.roleName}</div>
                    <div
                      className="text-[10px] text-slate-300 font-mono mt-0.5 break-all leading-tight"
                      title={persona.email}
                    >
                      {persona.email}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual Login Section */}
          <div className="p-6 sm:p-8">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@apparelflow.com"
                    className="!pl-9 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="!pl-9 text-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 text-xs rounded-md bg-rose-950/40 border border-rose-500/40 text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md shadow-sm transition-all duration-150 cursor-pointer mt-2"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In to Terminal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Webtezza Manufacturing Systems</span>
            <span className="font-mono">Security Tier 1 · RBAC Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
