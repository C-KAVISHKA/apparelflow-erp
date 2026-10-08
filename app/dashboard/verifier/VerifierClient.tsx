"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardNav from "../components/DashboardNav";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  ArrowRight,
  AlertOctagon,
  RefreshCw,
  X,
  FileCheck2,
  HelpCircle,
} from "lucide-react";

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
  createdAt: string;
  recipe: { name: string; recipeCode: string; stdFabricYards: number; wastageCap: number };
  creator: { fullName: string };
  verificationItems: VerificationItem[];
}

const TRAFFIC_LIGHT_META = {
  GREEN: {
    label: "Match (OK)",
    badge: "text-emerald-400 bg-emerald-950/40 border-emerald-500/40",
    icon: CheckCircle2,
  },
  YELLOW: {
    label: "Surplus (+)",
    badge: "text-amber-400 bg-amber-950/40 border-amber-500/40",
    icon: AlertTriangle,
  },
  RED: {
    label: "Shortage (Defect)",
    badge: "text-rose-400 bg-rose-950/40 border-rose-500/40",
    icon: XCircle,
  },
  PENDING: {
    label: "Uncounted",
    badge: "text-slate-400 bg-slate-900 border-slate-700",
    icon: Clock,
  },
};

export default function VerifierClient({ name }: { name: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [liveStatus, setLiveStatus] = useState<Record<string, "GREEN" | "YELLOW" | "RED" | "PENDING">>({});
  const [rejectionNote, setRejectionNote] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [noteError, setNoteError] = useState("");

  const fetchOrders = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/verify/queue");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // When an order is selected, populate default counts or items
  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    setMessage(null);
    const initialCounts: Record<string, string> = {};
    const initialStatus: Record<string, "GREEN" | "YELLOW" | "RED" | "PENDING"> = {};

    order.verificationItems.forEach((item) => {
      if (item.actualQty !== null && item.actualQty !== undefined) {
        initialCounts[item.componentId] = String(item.actualQty);
        initialStatus[item.componentId] = item.status as "GREEN" | "YELLOW" | "RED" | "PENDING";
      } else {
        initialCounts[item.componentId] = "";
        initialStatus[item.componentId] = "PENDING";
      }
    });

    setCounts(initialCounts);
    setLiveStatus(initialStatus);
  };

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

  const fillAllExpected = () => {
    if (!selectedOrder) return;
    const newCounts: Record<string, string> = {};
    const newStatus: Record<string, "GREEN" | "YELLOW" | "RED" | "PENDING"> = {};
    selectedOrder.verificationItems.forEach((item) => {
      newCounts[item.componentId] = String(item.expectedQty);
      newStatus[item.componentId] = "GREEN";
    });
    setCounts(newCounts);
    setLiveStatus(newStatus);
  };

  const hasRed = Object.values(liveStatus).some((s) => s === "RED");
  const allCounted = selectedOrder
    ? selectedOrder.verificationItems.every((item) => counts[item.componentId] !== undefined && counts[item.componentId] !== "")
    : false;

  const handleApprove = async () => {
    if (!selectedOrder) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/verify/${selectedOrder.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          counts: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, Number(v)])),
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "QC Approved: Batch released to Sewing Queue." });
        setTimeout(() => {
          setSelectedOrder(null);
          setCounts({});
          setLiveStatus({});
          setMessage(null);
          fetchOrders();
        }, 1500);
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Approval rejected by server" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedOrder) return;
    if (!rejectionNote.trim() || rejectionNote.trim().length < 5) {
      setNoteError("Rejection explanation must be at least 5 characters");
      return;
    }
    setNoteError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/verify/${selectedOrder.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rejectionNote,
          counts: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, Number(v)])),
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Batch Rejected: Returned to Cutting Supervisor for re-cut." });
        setShowRejectModal(false);
        setTimeout(() => {
          setSelectedOrder(null);
          setCounts({});
          setLiveStatus({});
          setMessage(null);
          setRejectionNote("");
          fetchOrders();
        }, 1500);
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Rejection failed" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardNav role="cutting_verifier" name={name} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Workspace Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">Gatekeeper Verification Terminal</h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                QC Station 02
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Physical piece verification station. Non-bypassable hard-stop prevents cut defect batches from reaching assembly.
            </p>
          </div>

          <button
            onClick={fetchOrders}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* Global Alert Notification */}
        {message && (
          <div
            className={`my-4 p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/50 border-rose-500/40 text-rose-300"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6">
          {/* Left Column: Pending Batches Queue */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-400">
                Pending Inspection ({orders.length})
              </span>
              <span className="text-[11px] text-slate-500">FIFO Queue</span>
            </div>

            {orders.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-xl">
                <FileCheck2 className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <div className="text-xs font-semibold text-slate-300">All batches inspected</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Zero pending cutting orders</div>
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => {
                  const isSelected = selectedOrder?.id === order.id;
                  return (
                    <button
                      key={order.id}
                      onClick={() => handleSelectOrder(order)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? "bg-blue-950/40 border-blue-500/60 ring-1 ring-blue-500/40"
                          : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono font-bold text-xs text-slate-100">{order.orderNo}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {order.targetQty} units
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-300">{order.recipe.name}</div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-500 font-mono">
                        <span>Roll: {order.fabricRollId}</span>
                        <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Physical QC Verification Terminal */}
          <div className="lg:col-span-8">
            {!selectedOrder ? (
              <div className="h-full min-h-[380px] flex flex-col items-center justify-center p-8 bg-slate-900/40 border border-slate-800 border-dashed rounded-xl text-center">
                <ShieldCheck className="w-12 h-12 text-slate-700 mb-3" />
                <div className="text-sm font-semibold text-slate-300">Select a Batch from Queue</div>
                <div className="text-xs text-slate-500 mt-1 max-w-sm">
                  Click any pending cutting batch on the left to begin component-by-component physical piece count verification.
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                {/* Active Terminal Header */}
                <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-100">{selectedOrder.orderNo}</span>
                      <span className="text-xs text-slate-400">· {selectedOrder.recipe.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Batch Target: <span className="text-slate-200 font-semibold">{selectedOrder.targetQty} units</span> | Roll Lot: {selectedOrder.fabricRollId}
                    </div>
                  </div>

                  <button
                    onClick={fillAllExpected}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-blue-400 hover:text-blue-300 bg-blue-950/40 border border-blue-800/60 rounded-md transition-colors cursor-pointer"
                  >
                    <span>Auto-Fill Expected</span>
                  </button>
                </div>

                {/* Hard-Stop Warning Banner (If Shortage is detected) */}
                {hasRed && (
                  <div className="px-5 py-3 bg-rose-950/40 border-b border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-300">
                    <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <div>
                      <div className="font-bold">GATEKEEPER HARD-STOP ENGAGED</div>
                      <div className="text-[11px] text-rose-300/80 mt-0.5">
                        Component shortage detected (Actual &lt; Expected). Batch cannot be approved or enter the sewing floor. Rejection with mandatory feedback is required.
                      </div>
                    </div>
                  </div>
                )}

                {/* Component Counting Matrix */}
                <div className="p-5 space-y-3">
                  <div className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-400 mb-2">
                    Component Traffic-Light Verification Grid
                  </div>

                  <div className="space-y-2.5">
                    {selectedOrder.verificationItems.map((item) => {
                      const val = counts[item.componentId] ?? "";
                      const status = liveStatus[item.componentId] || "PENDING";
                      const meta = TRAFFIC_LIGHT_META[status];
                      const Icon = meta.icon;

                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-slate-200 truncate">
                              {item.component.componentName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              Expected: <span className="text-slate-200 font-semibold">{item.expectedQty} pcs</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-28">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={val}
                                onChange={(e) => handleCountChange(item.componentId, e.target.value, item.expectedQty)}
                                placeholder="Count pcs"
                                className="!py-1.5 !px-2.5 !text-xs !font-mono text-center"
                              />
                            </div>

                            <div className={`w-32 flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono font-medium ${meta.badge}`}>
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{meta.label}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Terminal Actions Footer */}
                <div className="px-5 py-4 bg-slate-950/70 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-400 font-mono">
                    Verifier ID: <span className="text-slate-300">{name}</span>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      id="reject-batch-btn"
                      onClick={() => setShowRejectModal(true)}
                      className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-800/60 rounded-lg transition-colors cursor-pointer"
                    >
                      Reject Batch
                    </button>

                    <button
                      id="approve-batch-btn"
                      onClick={handleApprove}
                      disabled={hasRed || !allCounted || loading}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      {loading ? (
                        <span>Processing Sign-off...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve & Release to Sewing</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Rejection Justification Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertOctagon className="w-4 h-4" />
                <h2 className="text-sm font-bold text-slate-100">Reject Cutting Batch</h2>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-400">
                Provide an explicit reason for rejecting batch{" "}
                <span className="font-mono text-slate-200 font-bold">{selectedOrder?.orderNo}</span>. This feedback will be
                immediately returned to the Cutting Supervisor.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                  Defect / Shortage Reason *
                </label>
                <textarea
                  rows={3}
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="e.g. 8 pcs shortage on Sleeve Cuffs, fabric tear on Front Body panel..."
                  className="text-xs"
                />
                {noteError && <p className="text-xs text-rose-400 mt-1">{noteError}</p>}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="confirm-reject-btn"
                  onClick={handleReject}
                  disabled={loading}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:opacity-50 rounded-lg cursor-pointer"
                >
                  {loading ? "Recording Defect..." : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
