"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardNav from "../components/DashboardNav";

interface VerificationLog {
  decision: string;
  wastagePct: number | null;
  createdAt: string;
  verifier: { fullName: string; email: string };
}

interface Order {
  id: string;
  orderNo: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYds: number;
  status: string;
  updatedAt: string;
  recipe: { name: string; recipeCode: string; stdFabricYards: number; wastageCap: number };
  creator: { fullName: string };
  verificationItems: {
    component: { componentName: string };
    expectedQty: number;
    actualQty: number | null;
    status: string;
  }[];
  verificationLogs: VerificationLog[];
}

export default function SewingClient({ name }: { name: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/sewing/queue");
    if (res.ok) setOrders(await res.json());
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleStartSewing = async (orderId: string) => {
    setLoading(orderId);
    setMessage(null);
    const res = await fetch(`/api/sewing/${orderId}/start`, { method: "POST" });
    setLoading(null);
    if (res.ok) {
      setMessage({ type: "success", text: "🧵 Sewing assembly started!" });
      setSelected(null);
      fetchOrders();
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Failed to start sewing" });
    }
  };

  const getWastageColor = (pct: number, cap: number) => {
    if (pct > cap) return "#ef4444";
    if (pct > cap * 0.8) return "#eab308";
    return "#22c55e";
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e" }}>
      <DashboardNav role="sewing_supervisor" name={name} />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ color: "#f1f5f9", fontSize: "28px", fontWeight: "800", margin: 0 }}>🧵 Sewing Queue</h1>
          <p style={{ color: "#64748b", marginTop: "6px" }}>
            Only verified cutting batches appear here — {orders.length} batch{orders.length !== 1 ? "es" : ""} ready
          </p>
        </div>

        {message && (
          <div style={{ background: message.type === "success" ? "#052e16" : "#2d0a0a", border: `1px solid ${message.type === "success" ? "#22c55e" : "#ef4444"}`, borderRadius: "8px", padding: "12px 16px", color: message.type === "success" ? "#22c55e" : "#ef4444", fontSize: "14px", marginBottom: "24px" }}>
            {message.text}
          </div>
        )}

        {orders.length === 0 ? (
          <div style={{ background: "#111827", border: "1px solid #1f2d45", borderRadius: "16px", padding: "80px", textAlign: "center" }}>
            <div style={{ fontSize: "60px", marginBottom: "16px" }}>🧵</div>
            <h2 style={{ color: "#f1f5f9", fontSize: "20px", fontWeight: "700", margin: "0 0 8px 0" }}>Queue is Empty</h2>
            <p style={{ color: "#475569" }}>No verified batches are ready for sewing. Batches appear here once the Cutting Verifier approves them.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "20px" }}>
            {orders.map((order) => {
              const log = order.verificationLogs[0];
              const expectedFabric = order.recipe.stdFabricYards * order.targetQty;
              const wastagePct = log?.wastagePct ?? ((order.actualFabricYds - expectedFabric) / expectedFabric * 100);
              const wastageColor = getWastageColor(wastagePct, order.recipe.wastageCap);

              return (
                <div key={order.id} style={{ background: "#111827", border: "1px solid #1f2d45", borderRadius: "12px", overflow: "hidden", transition: "border-color 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#22c55e44")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1f2d45")}
                >
                  {/* Card Header */}
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid #1f2d45", background: "#0a1628" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ color: "#22c55e", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>✓ Verified</div>
                        <div style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: "800", fontFamily: "monospace" }}>{order.orderNo}</div>
                        <div style={{ color: "#94a3b8", fontSize: "13px" }}>{order.recipe.name} · {order.targetQty} units</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: wastageColor, fontSize: "18px", fontWeight: "700" }}>
                          {wastagePct >= 0 ? "+" : ""}{wastagePct.toFixed(1)}%
                        </div>
                        <div style={{ color: "#64748b", fontSize: "11px" }}>Fabric Wastage</div>
                        {wastagePct > order.recipe.wastageCap && (
                          <div style={{ color: "#ef4444", fontSize: "10px" }}>⚠ Exceeds {order.recipe.wastageCap}% cap</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: "16px 20px" }}>
                    {/* Verifier Attribution */}
                    {log && (
                      <div style={{ background: "#052e16", border: "1px solid #22c55e33", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px" }}>
                        <div style={{ color: "#22c55e", fontSize: "12px", fontWeight: "600" }}>
                          ✓ Verified by {log.verifier.fullName}
                        </div>
                        <div style={{ color: "#475569", fontSize: "11px", marginTop: "2px" }}>
                          {log.verifier.email} · {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </div>
                    )}

                    {/* Component Summary */}
                    <div style={{ marginBottom: "16px" }}>
                      {order.verificationItems.map((item, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: i < order.verificationItems.length - 1 ? "1px solid #1a2235" : "none" }}>
                          <span style={{ color: "#94a3b8", fontSize: "12px" }}>{item.component.componentName}</span>
                          <span style={{ color: item.status === "GREEN" ? "#22c55e" : item.status === "YELLOW" ? "#eab308" : "#64748b", fontSize: "12px", fontWeight: "600" }}>
                            {item.actualQty ?? "—"} / {item.expectedQty}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Details */}
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#475569", fontSize: "12px", marginBottom: "16px" }}>
                      <span>Roll: {order.fabricRollId}</span>
                      <span>{order.actualFabricYds} yds used</span>
                    </div>

                    <button
                      id={`start-sewing-${order.id}`}
                      onClick={() => handleStartSewing(order.id)}
                      disabled={loading === order.id}
                      style={{
                        width: "100%",
                        background: loading === order.id ? "#1a2235" : "#0f3724",
                        border: "1px solid #22c55e",
                        color: "#22c55e",
                        borderRadius: "8px",
                        padding: "10px",
                        cursor: loading === order.id ? "not-allowed" : "pointer",
                        fontSize: "14px",
                        fontWeight: "600",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => { if (loading !== order.id) e.currentTarget.style.background = "#052e16"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = loading === order.id ? "#1a2235" : "#0f3724"; }}
                    >
                      {loading === order.id ? "Starting..." : "🧵 Start Sewing Assembly"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
