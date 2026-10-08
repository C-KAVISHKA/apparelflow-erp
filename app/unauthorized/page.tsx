import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 shadow-lg shadow-rose-950/50">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h1 className="text-xl font-bold text-slate-100 tracking-tight">Access Restricted (403 Forbidden)</h1>
      <p className="text-xs text-slate-400 mt-2 max-w-sm">
        Role-based access boundary active. Your authenticated role does not have authorization to view this terminal or execute this action.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Login Portal</span>
      </Link>
    </div>
  );
}
