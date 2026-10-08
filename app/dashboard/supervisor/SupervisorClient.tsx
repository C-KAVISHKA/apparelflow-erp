"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardNav from "../components/DashboardNav";

interface Recipe {
  id: string;
  recipeCode: string;
  name: string;
  stdFabricYards: number;
  components: { id: string; componentName: string; piecesPerGarment: number }[];
}

interface Order {
  id: string;
  orderNo: string;
  status: string;
  targetQty: number;
  fabricRollId: string;
  actualFabricYds: number;
  createdAt: string;
  recipe: { name: string; recipeCode: string };
  verificationLogs: { decision: string; rejectionNote?: string }[];
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  CUTTING_IN_PROGRESS: { bg: "#1c1402", color: "#eab308", label: "In Progress" },
  PENDING_VERIFICATION: { bg: "#0c1a2e", color: "#3b82f6", label: "Pending Verification" },
  VERIFIED: { bg: "#052e16", color: "#22c55e", label: "Verified ✓" },
  REJECTED: { bg: "#2d0a0a", color: "#ef4444", label: "Rejected ✗" },
  SEWING_IN_PROGRESS: { bg: "#1a0a2e", color: "#a855f7", label: "Sewing" },
};

export default function SupervisorDashboard({ name }: { name: string }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    recipeId: "",
    targetQty: "",
    fabricRollId: "",
    actualFabricYds: "",
  });

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const fetchData = useCallback(async () => {
    const [recRes, ordRes] = await Promise.all([
      fetch("/api/recipes"),
      fetch("/api/orders"),
    ]);
    if (recRes.ok) setRecipes(await recRes.json());
    if (ordRes.ok) setOrders(await ordRes.json());
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.recipeId) e.recipeId = "Please select a recipe";
    const qty = Number(form.targetQty);
    if (!form.targetQty || isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) e.targetQty = "Must be a positive whole number";
    if (!form.fabricRollId.trim()) e.fabricRollId = "Fabric Roll ID is required";
    const fab = Number(form.actualFabricYds);
    if (!form.actualFabricYds || isNaN(fab) || fab <= 0) e.actualFabricYds = "Must be a positive number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipeId: form.recipeId,
        targetQty: Number(form.targetQty),
        fabricRollId: form.fabricRollId.trim(),
        actualFabricYds: Number(form.actualFabricYds),
      }),
    });

    setLoading(false);
    if (res.ok) {
      setShowModal(false);
      setForm({ recipeId: "", targetQty: "", fabricRollId: "", actualFabricYds: "" });
      setSelectedRecipe(null);
      fetchData();
    } else {
      const data = await res.json();
      setErrors({ submit: data.error || "Failed to create order" });
    }
  };

  const handleRecipeChange = (recipeId: string) => {
    setForm((f) => ({ ...f, recipeId }));
    setSelectedRecipe(recipes.find((r) => r.id === recipeId) || null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e" }}>
      <DashboardNav role="cutting_supervisor" name={name} />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
          <div>
            <h1 style={{ color: "#f1f5f9", fontSize: "28px", fontWeight: "800", margin: 0 }}>✂️ Cutting Supervisor</h1>
            <p style={{ color: "#64748b", marginTop: "6px" }}>Create and track cutting orders</p>
          </div>
          <button
            id="create-order-btn"
            onClick={() => setShowModal(true)}
            style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: "10px", padding: "12px 24px", fontSize: "15px", fontWeight: "600", cursor: "pointer", transition: "background 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#2563eb")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#3b82f6")}
          >
            + New Cutting Order
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          {Object.entries(STATUS_STYLES).map(([status, style]) => {
            const count = orders.filter((o) => o.status === status).length;
            return (
              <div key={status} style={{ background: style.bg, border: `1px solid ${style.color}33`, borderRadius: "10px", padding: "16px" }}>
                <div style={{ color: style.color, fontSize: "24px", fontWeight: "800" }}>{count}</div>
                <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "4px" }}>{style.label}</div>
              </div>
            );
          })}
        </div>

        {/* Orders Table */}
        <div style={{ background: "#111827", border: "1px solid #1f2d45", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #1f2d45" }}>
            <h2 style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: "700", margin: 0 }}>All Cutting Orders</h2>
          </div>
          {orders.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#475569" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
              <p>No cutting orders yet. Create your first order above.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1f2d45" }}>
                    {["Order No", "Recipe", "Qty", "Fabric Roll", "Actual Fabric", "Status", "Date"].map((h) => (
                      <th key={h} style={{ color: "#64748b", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", padding: "12px 16px", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const s = STATUS_STYLES[order.status] || STATUS_STYLES.CUTTING_IN_PROGRESS;
                    const lastLog = order.verificationLogs?.[0];
                    return (
                      <tr key={order.id} style={{ borderBottom: "1px solid #1a2235", transition: "background 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#1a2235")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "14px 16px", color: "#f1f5f9", fontWeight: "600", fontFamily: "monospace" }}>{order.orderNo}</td>
                        <td style={{ padding: "14px 16px", color: "#94a3b8" }}>
                          <div style={{ color: "#f1f5f9" }}>{order.recipe.name}</div>
                          <div style={{ fontSize: "11px", color: "#475569" }}>{order.recipe.recipeCode}</div>
                        </td>
                        <td style={{ padding: "14px 16px", color: "#94a3b8" }}>{order.targetQty} units</td>
                        <td style={{ padding: "14px 16px", color: "#94a3b8", fontFamily: "monospace" }}>{order.fabricRollId}</td>
                        <td style={{ padding: "14px 16px", color: "#94a3b8" }}>{order.actualFabricYds} yds</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}44`, borderRadius: "6px", padding: "4px 10px", fontSize: "12px", fontWeight: "600" }}>
                            {s.label}
                          </span>
                          {lastLog?.decision === "REJECTED" && lastLog.rejectionNote && (
                            <div style={{ color: "#ef4444", fontSize: "11px", marginTop: "4px", maxWidth: "200px" }}>↩ {lastLog.rejectionNote}</div>
                          )}
                        </td>
                        <td style={{ padding: "14px 16px", color: "#475569", fontSize: "12px" }}>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Order Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" }}>
          <div style={{ background: "#111827", border: "1px solid #1f2d45", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ color: "#f1f5f9", fontSize: "22px", fontWeight: "700", margin: 0 }}>✂️ New Cutting Order</h2>
              <button onClick={() => { setShowModal(false); setErrors({}); }} style={{ background: "transparent", border: "none", color: "#64748b", fontSize: "24px", cursor: "pointer" }}>×</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Recipe */}
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "13px", marginBottom: "8px", fontWeight: "500" }}>Production Recipe *</label>
                <select id="recipe-select" value={form.recipeId} onChange={(e) => handleRecipeChange(e.target.value)}>
                  <option value="" style={{ background: "#1e293b" }}>-- Select a recipe --</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id} style={{ background: "#1e293b" }}>{r.name} ({r.recipeCode})</option>
                  ))}
                </select>
                {errors.recipeId && <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>{errors.recipeId}</p>}
              </div>

              {/* Preview components */}
              {selectedRecipe && (
                <div style={{ background: "#1a2235", border: "1px solid #1f2d45", borderRadius: "8px", padding: "16px" }}>
                  <p style={{ color: "#64748b", fontSize: "12px", marginBottom: "10px", margin: "0 0 10px 0" }}>📦 Components — {selectedRecipe.stdFabricYards} yds/piece, {form.targetQty ? "Showing expected counts for " + form.targetQty + " units" : "enter qty to see expected counts"}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {selectedRecipe.components.map((c) => (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: "13px" }}>
                        <span>{c.componentName}</span>
                        <span style={{ color: "#3b82f6", fontWeight: "600" }}>
                          {form.targetQty && Number(form.targetQty) > 0
                            ? `${c.piecesPerGarment * Number(form.targetQty)} pcs`
                            : `${c.piecesPerGarment} pcs/garment`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Target Qty */}
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "13px", marginBottom: "8px", fontWeight: "500" }}>Target Batch Quantity (units) *</label>
                <input
                  id="target-qty"
                  type="number"
                  min="1"
                  step="1"
                  value={form.targetQty}
                  onChange={(e) => setForm((f) => ({ ...f, targetQty: e.target.value }))}
                  placeholder="e.g. 50"
                />
                {errors.targetQty && <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>{errors.targetQty}</p>}
              </div>

              {/* Fabric Roll ID */}
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "13px", marginBottom: "8px", fontWeight: "500" }}>Fabric Roll ID *</label>
                <input
                  id="fabric-roll-id"
                  type="text"
                  value={form.fabricRollId}
                  onChange={(e) => setForm((f) => ({ ...f, fabricRollId: e.target.value }))}
                  placeholder="e.g. FAB-ROLL-882"
                />
                {errors.fabricRollId && <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>{errors.fabricRollId}</p>}
              </div>

              {/* Actual Fabric Used */}
              <div>
                <label style={{ display: "block", color: "#94a3b8", fontSize: "13px", marginBottom: "8px", fontWeight: "500" }}>Actual Fabric Used (yards) *</label>
                <input
                  id="actual-fabric"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.actualFabricYds}
                  onChange={(e) => setForm((f) => ({ ...f, actualFabricYds: e.target.value }))}
                  placeholder="e.g. 92.5"
                />
                {errors.actualFabricYds && <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px" }}>{errors.actualFabricYds}</p>}
              </div>

              {errors.submit && (
                <div style={{ background: "#2d0a0a", border: "1px solid #ef4444", borderRadius: "8px", padding: "12px", color: "#ef4444", fontSize: "14px" }}>
                  ⚠️ {errors.submit}
                </div>
              )}

              <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
                <button type="button" onClick={() => { setShowModal(false); setErrors({}); }}
                  style={{ flex: 1, background: "transparent", border: "1px solid #334155", color: "#94a3b8", borderRadius: "8px", padding: "12px", cursor: "pointer", fontSize: "14px" }}>
                  Cancel
                </button>
                <button id="submit-order-btn" type="submit" disabled={loading}
                  style={{ flex: 2, background: loading ? "#1e3a8a" : "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", padding: "12px", cursor: loading ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: "600" }}>
                  {loading ? "Creating..." : "Create Order →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
