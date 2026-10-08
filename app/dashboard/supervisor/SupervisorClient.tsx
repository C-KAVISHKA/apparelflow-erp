"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardNav from "../components/DashboardNav";
import {
  Scissors,
  Plus,
  Search,
  Layers,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  FileSpreadsheet,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

interface Recipe {
  id: string;
  recipeCode: string;
  name: string;
  category: string;
  stdFabricYards: number;
  wastageCap: number;
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
  recipe: { name: string; recipeCode: string; stdFabricYards: number; wastageCap: number };
  verificationLogs: { decision: string; rejectionNote?: string; createdAt: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
  CUTTING_IN_PROGRESS: {
    label: "Cutting In-Progress",
    badge: "text-amber-400 bg-amber-950/40 border-amber-500/30",
    icon: <Clock className="w-3 h-3 text-amber-400" />,
  },
  PENDING_VERIFICATION: {
    label: "Pending Verification",
    badge: "text-blue-400 bg-blue-950/40 border-blue-500/30",
    icon: <ShieldCheck className="w-3 h-3 text-blue-400" />,
  },
  VERIFIED: {
    label: "QC Verified",
    badge: "text-emerald-400 bg-emerald-950/40 border-emerald-500/30",
    icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
  },
  REJECTED: {
    label: "Rework Required",
    badge: "text-rose-400 bg-rose-950/40 border-rose-500/30",
    icon: <AlertTriangle className="w-3 h-3 text-rose-400" />,
  },
  SEWING_IN_PROGRESS: {
    label: "Assembly In-Progress",
    badge: "text-purple-400 bg-purple-950/40 border-purple-500/30",
    icon: <Layers className="w-3 h-3 text-purple-400" />,
  },
};

export default function SupervisorClient({ name }: { name: string }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    recipeId: "",
    targetQty: "",
    fabricRollId: "",
    actualFabricYds: "",
  });

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [recRes, ordRes] = await Promise.all([
        fetch("/api/recipes"),
        fetch("/api/orders"),
      ]);
      if (recRes.ok) setRecipes(await recRes.json());
      if (ordRes.ok) setOrders(await ordRes.json());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRecipeChange = (recipeId: string) => {
    setForm((f) => ({ ...f, recipeId }));
    setSelectedRecipe(recipes.find((r) => r.id === recipeId) || null);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.recipeId) e.recipeId = "Production recipe selection is required";
    const qty = Number(form.targetQty);
    if (!form.targetQty || isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
      e.targetQty = "Target quantity must be a positive integer";
    }
    if (!form.fabricRollId.trim()) {
      e.fabricRollId = "Fabric roll identifier is required";
    }
    const fab = Number(form.actualFabricYds);
    if (!form.actualFabricYds || isNaN(fab) || fab <= 0) {
      e.actualFabricYds = "Actual fabric yardage must be a positive numeric value";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
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

      if (res.ok) {
        setShowModal(false);
        setForm({ recipeId: "", targetQty: "", fabricRollId: "", actualFabricYds: "" });
        setSelectedRecipe(null);
        setErrors({});
        fetchData();
      } else {
        const data = await res.json();
        setErrors({ submit: data.error || "Order creation failed" });
      }
    } finally {
      setLoading(false);
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.fabricRollId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPI calculations
  const totalYards = orders.reduce((sum, o) => sum + o.actualFabricYds, 0);
  const pendingCount = orders.filter((o) => o.status === "PENDING_VERIFICATION").length;
  const verifiedCount = orders.filter((o) => o.status === "VERIFIED" || o.status === "SEWING_IN_PROGRESS").length;
  const rejectedCount = orders.filter((o) => o.status === "REJECTED").length;

  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardNav role="cutting_supervisor" name={name} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Workspace Title & Primary Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">Cutting Operations Terminal</h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/60">
                Department 04
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Initiate production batches, configure BOM multipliers, and monitor gatekeeper verification status.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Refresh queue"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button
              id="create-order-btn"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Cutting Batch</span>
            </button>
          </div>
        </div>

        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-6">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Total Batches Logged</span>
              <FileSpreadsheet className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold text-slate-100 mt-2 font-mono">{orders.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">{totalYards.toFixed(1)} yds cut total</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Pending QC Verification</span>
              <ShieldCheck className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-400 mt-2 font-mono">{pendingCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Awaiting verifier physical count</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Verified for Sewing</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 mt-2 font-mono">{verifiedCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Gatekeeper approval granted</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Rework / Rejections</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-400 mt-2 font-mono">{rejectedCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Defect / shortage feedback returned</div>
          </div>
        </div>

        {/* Orders Table Container */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          {/* Table Header & Search Filter */}
          <div className="p-4 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/40">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search batch, recipe, roll..."
                className="!pl-9 !py-1.5 !text-xs !rounded-lg"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="!py-1.5 !text-xs !w-auto !rounded-lg font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING_VERIFICATION">Pending QC</option>
                <option value="VERIFIED">Verified</option>
                <option value="REJECTED">Rework Required</option>
                <option value="SEWING_IN_PROGRESS">In Sewing</option>
              </select>
            </div>
          </div>

          {/* Table Content */}
          {filteredOrders.length === 0 ? (
            <div className="py-16 text-center">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-600 mb-3" />
              <div className="text-sm font-semibold text-slate-300">No cutting orders found</div>
              <div className="text-xs text-slate-500 mt-1">Create a new batch or adjust your search filter.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase font-mono tracking-wider text-[11px]">
                    <th className="px-4 py-3">Batch Number</th>
                    <th className="px-4 py-3">Recipe (BOM)</th>
                    <th className="px-4 py-3">Batch Size</th>
                    <th className="px-4 py-3">Fabric Roll ID</th>
                    <th className="px-4 py-3">Actual Yardage</th>
                    <th className="px-4 py-3">QC Status</th>
                    <th className="px-4 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredOrders.map((order) => {
                    const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.CUTTING_IN_PROGRESS;
                    const lastLog = order.verificationLogs?.[0];
                    const isRejected = order.status === "REJECTED";

                    return (
                      <tr
                        key={order.id}
                        className={`hover:bg-slate-850/50 transition-colors ${
                          isRejected ? "bg-rose-950/10" : ""
                        }`}
                      >
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-200">{order.orderNo}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-200">{order.recipe.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{order.recipe.recipeCode}</div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-300">{order.targetQty} units</td>
                        <td className="px-4 py-3.5 font-mono text-slate-400">{order.fabricRollId}</td>
                        <td className="px-4 py-3.5 font-mono text-slate-300">{order.actualFabricYds} yds</td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${statusConfig.badge}`}
                            >
                              {statusConfig.icon}
                              <span>{statusConfig.label}</span>
                            </span>
                            {isRejected && lastLog?.rejectionNote && (
                              <div className="text-[11px] text-rose-400 bg-rose-950/40 border border-rose-900/50 rounded px-2 py-1 mt-1 max-w-xs">
                                <span className="font-bold">Reason:</span> {lastLog.rejectionNote}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 font-mono">
                          {new Date(order.createdAt).toLocaleDateString()} · {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* New Cutting Order Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-blue-400" />
                <h2 className="text-base font-bold text-slate-100">Log New Cutting Batch</h2>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setErrors({});
                }}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Recipe Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Production Recipe (BOM) *
                </label>
                <select
                  id="recipe-select"
                  value={form.recipeId}
                  onChange={(e) => handleRecipeChange(e.target.value)}
                  className="text-sm font-medium"
                >
                  <option value="">-- Choose Garment Recipe --</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.recipeCode}) — {r.stdFabricYards} yds/pc standard
                    </option>
                  ))}
                </select>
                {errors.recipeId && <p className="text-xs text-rose-400 mt-1">{errors.recipeId}</p>}
              </div>

              {/* Dynamic Bill of Materials breakdown */}
              {selectedRecipe && (
                <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="font-semibold text-slate-300">Derived Cut Components</span>
                    <span className="font-mono text-[11px]">
                      {form.targetQty ? `${form.targetQty} units multiplier` : "1 unit base"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRecipe.components.map((c) => {
                      const qty = Number(form.targetQty) || 1;
                      const totalCutPcs = c.piecesPerGarment * qty;
                      return (
                        <div key={c.id} className="p-2 rounded bg-slate-900 border border-slate-800/80">
                          <div className="text-slate-400 text-[11px] truncate">{c.componentName}</div>
                          <div className="text-sm font-bold text-blue-400 font-mono mt-0.5">
                            {form.targetQty ? `${totalCutPcs} pcs` : `${c.piecesPerGarment} pcs/unit`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Target Batch Units */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Target Batch Quantity (Garment Units) *
                </label>
                <input
                  id="target-qty"
                  type="number"
                  min="1"
                  step="1"
                  value={form.targetQty}
                  onChange={(e) => setForm((f) => ({ ...f, targetQty: e.target.value }))}
                  placeholder="e.g. 50"
                  className="font-mono"
                />
                {errors.targetQty && <p className="text-xs text-rose-400 mt-1">{errors.targetQty}</p>}
              </div>

              {/* Fabric Roll Identifier */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Fabric Roll Barcode / Lot ID *
                </label>
                <input
                  id="fabric-roll-id"
                  type="text"
                  value={form.fabricRollId}
                  onChange={(e) => setForm((f) => ({ ...f, fabricRollId: e.target.value }))}
                  placeholder="e.g. FAB-ROLL-882"
                  className="font-mono"
                />
                {errors.fabricRollId && <p className="text-xs text-rose-400 mt-1">{errors.fabricRollId}</p>}
              </div>

              {/* Actual Fabric Yardage */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Actual Fabric Consumed (Yards) *
                </label>
                <input
                  id="actual-fabric"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.actualFabricYds}
                  onChange={(e) => setForm((f) => ({ ...f, actualFabricYds: e.target.value }))}
                  placeholder="e.g. 92.5"
                  className="font-mono"
                />
                {errors.actualFabricYds && <p className="text-xs text-rose-400 mt-1">{errors.actualFabricYds}</p>}
              </div>

              {errors.submit && (
                <div className="p-3 text-xs rounded bg-rose-950/40 border border-rose-500/40 text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errors.submit}</span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setErrors({});
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-order-btn"
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm cursor-pointer"
                >
                  {loading ? "Registering Batch..." : "Submit to Verification Queue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
