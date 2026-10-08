"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardNav from "../components/DashboardNav";

interface VerificationItem {
  id: string;
  componentId: string;
  expectedQty: number;
  actualQty: number | null;
  status: "GREEN" | "YELLOW" | "RED" | "PENDING";
  component: { componentName: string };
}

interface Order {
  id: string;
  orderNo: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYds: number;
  recipe: { name: string; recipeCode: string; stdFabricYards: number; wastageCap: number };
  creator: { fullName: string };
  verificationItems: VerificationItem[];
}

const STATUS_LIGHT: Record<string, { bg: string; color: string; label: string; icon: string }> = {
  GREEN: { bg: "#052e16", color: "#22c55e", label: "MATCH", icon: "🟢" },
  YELLOW: { bg: "#1c1402", color: "#eab308", label: "EXCESS", icon: "🟡" },
  RED: { bg: "#2d0a0a", color: "#ef4444", label: "SHORTAGE", icon: "🔴" },
  PENDING: { bg: "#1a2235", color: "#64748b", label: "PENDING", icon: "⚪" },
};

export default function VerifierClient({ name }: { name: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [liveStatus, setLiveStatus] = useState<Record<string, "GREEN" | "YELLOW" | "RED" | "PENDING">>({});
  const [rejectionNote, setRejectionNote] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [noteError, setNoteError] = useState("");

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/verify/queue");
    if (res.ok) setOrders(await res.json());
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateLiveStatus = (componentId: string, value: string, expectedQty: number) => {
    const qty = Number(value);
    if (value === "" || isNaN(qty) || qty < 0) {
      setLiveStatus((s) => ({ ...s, [componentId]: "PENDING" }));
      return;
    }
    if (qty === expectedQty) setLiveStatus((s) => ({ ...s, [componentId]: "GREEN" }));
    else if (qty > expectedQty) setLiveStatus((s) => ({ ...s, [componentId]: "YELLOW" }));
    else setLiveStatus((s) => ({ ...s, [componentId]: "RED" }));
  };

  const handleCountChange = (componentId: string, value: string, expectedQty: number) => {
    if (value !== "" && (isNaN(Number(value)) || Number(value) < 0 || value.includes("."))) return;
    setCounts((c) => ({ ...c, [componentId]: value }));
    updateLiveStatus(componentId, value, expectedQty);
  };

  const hasRed = Object.values(liveStatus).some((s) => s === "RED");
  const allCounted = selectedOrder
    ? selectedOrder.verificationItems.every((item) => counts[item.componentId] !== undefined && counts[item.componentId] !== "")
    : false;

  const handleApprove = async () => {
    if (!selectedOrder) return;
    setLoading(true);
    setMessage(null);

    const res = await fetch(`/api/verify/${selectedOrder.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counts: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, Number(v)])) }),
    });

    setLoading(false);
    if (res.ok) {
      setMessage({ type: "success", text: "✅ Batch approved and released to Sewing Queue!" });
      setTimeout(() => { setSelectedOrder(null); setCounts({}); setLiveStatus({}); setMessage(null); fetchOrders(); }, 2000);
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Approval failed" });
    }
  };

  const handleReject = async () => {
    if (!selectedOrder) return;
    if (!rejectionNote.trim() || rejectionNote.trim().length < 5) {
      setNoteError("Rejection reason must be at least 5 characters");
      return;
    }
    setNoteError("");
    setLoading(true);

    const res = await fetch(`/api/verify/${selectedOrder.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rejectionNote,
        counts: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, Number(v)])),
      }),
    });

    setLoading(false);
    if (res.ok) {
      setMessage({ type: "success", text: "↩ Batch rejected and returned to supervisor." });
      setShowRejectModal(false);
      setTimeout(() => { setSelectedOrder(null); setCounts({}); setLiveStatus({}); setMessage(null); setRejectionNote(""); fetchOrders(); }, 2000);
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Rejection failed" });
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e" }}>
      <DashboardNav role="cutting_verifier" name={name} />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ color: "#f1f5f9", fontSize: "28px", fontWeight: "800", margin: 0 }}>🔍 Verification Terminal</h1>
          <p style={{ color: "#64748b", marginTop: "6px" }}>Count components and verify cutting batches</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: selectedOrder ? "340px 1fr" : "1fr", gap: "24px" }}>
          {/* Queue List */}
          <div>
            <h2 style={{ color: "#94a3b8", fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
              Pending Verification ({orders.length})
            </h2>
            {orders.length === 0 ? (
              <div style={{ background: "#111827", border: "1px solid #1f2d45", borderRadius: "12px", padding: "40px", textAlign: "center", color: "#475569" }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>✅</div>
                <p>No batches pending verification</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {orders.map((order) => (
                  <button
                    key={order.id}
                    id={`order-${order.orderNo}`}
                    onClick={() => { setSelectedOrder(order); setCounts({}); setLiveStatus({}); setMessage(null); }}
                    style={{
                      background: selectedOrder?.id === order.id ? "#1a2e4a" : "#111827",
                      border: `1px solid ${selectedOrder?.id === order.id ? "#3b82f6" : "#1f2d45"}`,
                      borderRadius: "10px", padding: "16px", cursor: "pointer", textAlign: "left", width: "100%", transition: "all 0.2s",
                    }}
                  >
                    <div style={{ color: "#f1f5f9", fontWeight: "600", fontFamily: "monospace" }}>{order.orderNo}</div>
                    <div style={{ color: "#94a3b8", fontSize: "13px", marginTop: "4px" }}>{order.recipe.name}</div>
                    <div style={{ color: "#475569", fontSize: "12px", marginTop: "4px" }}>{order.targetQty} units · {order.creator.fullName}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Verification Panel */}
          {selectedOrder && (
            <div style={{ background: "#111827", border: "1px solid #1f2d45", borderRadius: "12px", overflow: "hidden" }}>
              {/* Order Header */}
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #1f2d45", background: "#0f1a2e" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ color: "#3b82f6", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>Verifying Batch</div>
                    <div style={{ color: "#f1f5f9", fontSize: "22px", fontWeight: "800", fontFamily: "monospace" }}>{selectedOrder.orderNo}</div>
                    <div style={{ color: "#94a3b8", fontSize: "14px", marginTop: "4px" }}>
                      {selectedOrder.recipe.name} · {selectedOrder.targetQty} units · Roll: {selectedOrder.fabricRollId}
                    </div>
                  </div>
                  {hasRed && (
                    <div style={{ background: "#2d0a0a", border: "1px solid #ef4444", borderRadius: "8px", padding: "8px 14px", color: "#ef4444", fontSize: "13px", fontWeight: "600" }}>
                      🔴 SHORTAGE DETECTED
                    </div>
                  )}
                </div>
              </div>

              {/* Component Count Grid */}
              <div style={{ padding: "24px" }}>
                <h3 style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "16px", margin: "0 0 16px 0" }}>
                  Component Count Entry
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
                  {selectedOrder.verificationItems.map((item) => {
                    const status = liveStatus[item.componentId] || "PENDING";
                    const light = STATUS_LIGHT[status];
                    return (
                      <div key={item.id} style={{ background: light.bg, border: `1px solid ${light.color}33`, borderRadius: "10px", padding: "16px", display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ fontSize: "20px" }}>{light.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: "#f1f5f9", fontWeight: "600", fontSize: "14px" }}>{item.component.componentName}</div>
                          <div style={{ color: "#64748b", fontSize: "12px" }}>Expected: <span style={{ color: "#94a3b8", fontWeight: "600" }}>{item.expectedQty} pcs</span></div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <input
                            id={`count-${item.componentId}`}
                            type="number"
                            min="0"
                            step="1"
                            value={counts[item.componentId] || ""}
                            onChange={(e) => handleCountChange(item.componentId, e.target.value, item.expectedQty)}
                            placeholder="Enter count"
                            style={{ width: "140px", textAlign: "center", borderColor: light.color + "66" }}
                          />
                          <div style={{ color: light.color, fontSize: "11px", fontWeight: "600", marginTop: "4px" }}>{status}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Message */}
                {message && (
                  <div style={{ background: message.type === "success" ? "#052e16" : "#2d0a0a", border: `1px solid ${message.type === "success" ? "#22c55e" : "#ef4444"}`, borderRadius: "8px", padding: "12px 16px", color: message.type === "success" ? "#22c55e" : "#ef4444", fontSize: "14px", marginBottom: "16px" }}>
                    {message.text}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    id="reject-batch-btn"
                    onClick={() => setShowRejectModal(true)}
                    style={{ flex: 1, background: "#2d0a0a", border: "1px solid #ef4444", color: "#ef4444", borderRadius: "8px", padding: "12px", cursor: "pointer", fontSize: "14px", fontWeight: "600", transition: "all 0.2s" }}
                  >
                    ✗ Reject Batch
                  </button>
                  <button
                    id="approve-batch-btn"
                    onClick={handleApprove}
                    disabled={hasRed || !allCounted || loading}
                    title={hasRed ? "Cannot approve: shortage detected" : !allCounted ? "Count all components first" : "Approve batch"}
                    style={{
                      flex: 2,
                      background: hasRed || !allCounted ? "#1a2235" : "#052e16",
                      border: `1px solid ${hasRed || !allCounted ? "#334155" : "#22c55e"}`,
                      color: hasRed || !allCounted ? "#475569" : "#22c55e",
                      borderRadius: "8px", padding: "12px",
                      cursor: hasRed || !allCounted || loading ? "not-allowed" : "pointer",
                      fontSize: "14px", fontWeight: "600", transition: "all 0.2s",
                    }}
                  >
                    {loading ? "Processing..." : hasRed ? "🔴 Approval Blocked — Shortage" : !allCounted ? "Count All Components First" : "✓ Approve Batch"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" }}>
          <div style={{ background: "#111827", border: "1px solid #ef4444", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "480px" }}>
            <h2 style={{ color: "#ef4444", fontSize: "20px", fontWeight: "700", margin: "0 0 8px 0" }}>✗ Reject Batch</h2>
            <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "20px" }}>This batch will be returned to the Cutting Supervisor. A reason is mandatory.</p>
            <div>
              <label style={{ display: "block", color: "#94a3b8", fontSize: "13px", marginBottom: "8px", fontWeight: "500" }}>Rejection Reason *</label>
              <textarea
                id="rejection-note"
                rows={4}
                value={rejectionNote}
                onChange={(e) => { setRejectionNote(e.target.value); setNoteError(""); }}
                placeholder="Describe the defect or shortage (minimum 5 characters)..."
                style={{ resize: "vertical" }}
              />
              {noteError && <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>{noteError}</p>}
            </div>
            <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <button onClick={() => { setShowRejectModal(false); setNoteError(""); }}
                style={{ flex: 1, background: "transparent", border: "1px solid #334155", color: "#94a3b8", borderRadius: "8px", padding: "12px", cursor: "pointer", fontSize: "14px" }}>
                Cancel
              </button>
              <button id="confirm-reject-btn" onClick={handleReject} disabled={loading}
                style={{ flex: 2, background: "#7f1d1d", border: "1px solid #ef4444", color: "#ef4444", borderRadius: "8px", padding: "12px", cursor: loading ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "600" }}>
                {loading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
