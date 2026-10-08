"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardNav from "../components/DashboardNav";
import {
  Layers,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Play,
  RefreshCw,
  Percent,
  TrendingUp,
  AlertTriangle,
  FileCheck2,
  Sparkles,
} from "lucide-react";

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
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchOrders = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/sewing/queue");
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

  const handleStartSewing = async (orderId: string) => {
    setLoadingId(orderId);
    setMessage(null);

    try {
      const res = await fetch(`/api/sewing/${orderId}/start`, { method: "POST" });
      if (res.ok) {
        setMessage({ type: "success", text: "Assembly line activated: Batch transitioned to IN_SEWING." });
        fetchOrders();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to initiate sewing" });
      }
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardNav role="sewing_supervisor" name={name} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100 tracking-tight">Sewing Assembly Queue</h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800/60">
                Floor Section 08
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Guaranteed zero-defect queue. Only batches stamped with official QC gatekeeper approval are released here.
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

        {/* Global Notification */}
        {message && (
          <div
            className={`my-4 p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300"
                : "bg-rose-950/50 border-rose-500/40 text-rose-300"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Queue Stats Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Ready for Assembly</div>
            <div className="text-2xl font-bold text-purple-400 font-mono mt-2">{orders.length}</div>
            <div className="text-[11px] text-slate-500 mt-1">100% QC gatekeeper verified</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Total Garments to Assemble</div>
            <div className="text-2xl font-bold text-slate-100 font-mono mt-2">
              {orders.reduce((acc, o) => acc + o.targetQty, 0)} units
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Active verified workload</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">QC Policy Enforcement</div>
            <div className="text-sm font-semibold text-emerald-400 mt-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero-Shortage Enforced</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Server-side query isolation</div>
          </div>
        </div>

        {/* Verified Batch Cards Grid */}
        {orders.length === 0 ? (
          <div className="py-20 text-center bg-slate-900/40 border border-slate-800 border-dashed rounded-xl my-6">
            <FileCheck2 className="w-12 h-12 mx-auto text-slate-700 mb-3" />
            <div className="text-sm font-semibold text-slate-300">No Batches in Sewing Queue</div>
            <div className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Batches will automatically appear here once inspected and digitally signed off by the Quality Verifier.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 my-6">
            {orders.map((order) => {
              const log = order.verificationLogs[0];
              const expectedFabric = order.recipe.stdFabricYards * order.targetQty;
              const wastagePct =
                log?.wastagePct ??
                ((order.actualFabricYds - expectedFabric) / expectedFabric) * 100;
              const isOverCap = wastagePct > order.recipe.wastageCap;
              const isCloseCap = wastagePct > order.recipe.wastageCap * 0.8;

              return (
                <div
                  key={order.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden shadow-lg flex flex-col transition-all"
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-slate-800/80 bg-slate-950/50 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-xs text-slate-100">{order.orderNo}</span>
                      <div className="text-xs font-semibold text-slate-300 mt-0.5">{order.recipe.name}</div>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-medium">
                      QC Verified
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3.5 flex-1 text-xs">
                    {/* Key Specs */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 font-mono">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Batch Quantity</div>
                        <div className="text-sm font-bold text-slate-200 mt-0.5">{order.targetQty} units</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Fabric Consumed</div>
                        <div className="text-sm font-bold text-slate-200 mt-0.5">{order.actualFabricYds} yds</div>
                      </div>
                    </div>

                    {/* Component Count Breakdown */}
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-mono mb-1.5">
                        Verified Components
                      </div>
                      <div className="space-y-1">
                        {order.verificationItems.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-[11px] py-1 border-b border-slate-850"
                          >
                            <span className="text-slate-300">{item.component.componentName}</span>
                            <span className="font-mono font-semibold text-emerald-400">
                              {item.actualQty ?? item.expectedQty} pcs ✓
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Verifier Attribution & Wastage */}
                    <div className="pt-2 space-y-2 border-t border-slate-800/80 text-[11px]">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>QC Verifier:</span>
                        <span className="font-mono text-slate-200 font-medium">{log?.verifier.fullName || "QC Officer"}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Fabric Wastage:</span>
                        <span
                          className={`font-mono font-bold ${
                            isOverCap
                              ? "text-rose-400"
                              : isCloseCap
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {wastagePct > 0 ? `+${wastagePct.toFixed(1)}%` : `${wastagePct.toFixed(1)}%`}
                          <span className="text-[10px] text-slate-500 font-normal ml-1">
                            (Cap: {order.recipe.wastageCap}%)
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action */}
                  <div className="p-4 bg-slate-950/60 border-t border-slate-800">
                    <button
                      id={`start-sewing-${order.orderNo}`}
                      onClick={() => handleStartSewing(order.id)}
                      disabled={loadingId === order.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:opacity-50 rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      {loadingId === order.id ? (
                        <span>Initializing Line...</span>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Start Sewing Assembly</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
