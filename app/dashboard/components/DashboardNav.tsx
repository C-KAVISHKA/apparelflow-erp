"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const roleConfig: Record<string, { label: string; color: string; icon: string }> = {
  cutting_supervisor: { label: "Cutting Supervisor", color: "#3b82f6", icon: "✂️" },
  cutting_verifier: { label: "Cutting Verifier", color: "#22c55e", icon: "🔍" },
  sewing_supervisor: { label: "Sewing Supervisor", color: "#a855f7", icon: "🧵" },
};

export default function DashboardNav({ role, name }: { role: string; name: string }) {
  const config = roleConfig[role] || { label: role, color: "#94a3b8", icon: "👤" };

  return (
    <nav style={{
      background: "#111827",
      borderBottom: "1px solid #1f2d45",
      padding: "0 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      height: "64px",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "24px" }}>🏭</span>
        <div>
          <div style={{ color: "#f1f5f9", fontWeight: "700", fontSize: "16px", lineHeight: 1 }}>ApparelFlow ERP</div>
          <div style={{ color: "#64748b", fontSize: "11px" }}>Cutting Operations Terminal</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#1a2235", border: `1px solid ${config.color}33`, borderRadius: "8px", padding: "8px 14px" }}>
          <span>{config.icon}</span>
          <div>
            <div style={{ color: config.color, fontSize: "13px", fontWeight: "600" }}>{config.label}</div>
            <div style={{ color: "#64748b", fontSize: "11px" }}>{name}</div>
          </div>
        </div>

        <button
          id="logout-btn"
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{ background: "transparent", border: "1px solid #334155", color: "#94a3b8", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontSize: "13px", transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#ef4444"; e.currentTarget.style.color = "#ef4444"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#94a3b8"; }}
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}
