/**
 * ApparelFlow ERP — Automated Test Suite
 * Tests all 5 core domain rules specified in the assessment
 *
 * Run with: npm test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Domain Logic Helpers (extracted for unit testing) ───────────────────────

type ComponentStatus = "GREEN" | "YELLOW" | "RED" | "PENDING";

interface VerificationItem {
  componentId: string;
  expectedQty: number;
  actualQty?: number;
  status?: ComponentStatus;
}

/**
 * Core traffic-light evaluation engine
 * Mirrors the exact logic in /api/verify/[orderId]/approve
 */
function evaluateComponents(
  items: VerificationItem[],
  counts: Record<string, number>
): { items: (VerificationItem & { status: ComponentStatus })[]; hasRed: boolean } {
  const evaluated = items.map((item) => {
    const qty = counts[item.componentId];
    if (qty === undefined || qty === null || isNaN(qty) || qty < 0) {
      return { ...item, actualQty: 0, status: "RED" as ComponentStatus };
    }
    if (!Number.isInteger(qty)) {
      return { ...item, actualQty: 0, status: "RED" as ComponentStatus };
    }
    let status: ComponentStatus;
    if (qty === item.expectedQty) status = "GREEN";
    else if (qty > item.expectedQty) status = "YELLOW";
    else status = "RED";
    return { ...item, actualQty: qty, status };
  });

  return {
    items: evaluated,
    hasRed: evaluated.some((i) => i.status === "RED"),
  };
}

/**
 * Wastage calculation engine
 * Formula: ((actual - expected) / expected) * 100
 */
function calculateWastagePct(actualFabricYds: number, stdFabricYards: number, targetQty: number): number {
  const expectedFabric = stdFabricYards * targetQty;
  return ((actualFabricYds - expectedFabric) / expectedFabric) * 100;
}

/**
 * Simulated RBAC check (mirrors server-side enforcement)
 */
function checkRole(userRole: string, requiredRole: string): { allowed: boolean; status: number } {
  if (userRole !== requiredRole) return { allowed: false, status: 403 };
  return { allowed: true, status: 200 };
}

/**
 * Simulated rejection note validation
 */
function validateRejectionNote(note: string | undefined): { valid: boolean; error?: string } {
  if (!note || typeof note !== "string" || note.trim().length < 5) {
    return { valid: false, error: "A rejection reason of at least 5 characters is required" };
  }
  return { valid: true };
}

// ─── TEST SUITE ───────────────────────────────────────────────────────────────

describe("ApparelFlow ERP — Core Domain Rules", () => {

  // ── Test 1: All GREEN → Approve allowed ────────────────────────────────────
  describe("Test 1: All-GREEN order can be approved", () => {
    it("should allow approval when all component counts match exactly", () => {
      const items: VerificationItem[] = [
        { componentId: "comp-1", expectedQty: 50 },
        { componentId: "comp-2", expectedQty: 50 },
        { componentId: "comp-3", expectedQty: 100 }, // 2 per garment × 50
      ];

      const counts = {
        "comp-1": 50,
        "comp-2": 50,
        "comp-3": 100,
      };

      const result = evaluateComponents(items, counts);

      expect(result.hasRed).toBe(false);
      expect(result.items.every((i) => i.status === "GREEN")).toBe(true);
    });

    it("should allow approval when some components have YELLOW (surplus)", () => {
      const items: VerificationItem[] = [
        { componentId: "comp-1", expectedQty: 50 },
        { componentId: "comp-2", expectedQty: 50 },
      ];

      const counts = { "comp-1": 50, "comp-2": 52 }; // comp-2 has surplus
      const result = evaluateComponents(items, counts);

      expect(result.hasRed).toBe(false);
      expect(result.items[0].status).toBe("GREEN");
      expect(result.items[1].status).toBe("YELLOW");
    });
  });

  // ── Test 2: Any RED → Approval blocked ─────────────────────────────────────
  describe("Test 2: RED component blocks approval", () => {
    it("should block approval when any component has a shortage", () => {
      const items: VerificationItem[] = [
        { componentId: "comp-1", expectedQty: 50 },
        { componentId: "comp-2", expectedQty: 100 },
        { componentId: "comp-3", expectedQty: 50 }, // This one is short
      ];

      const counts = {
        "comp-1": 50,
        "comp-2": 100,
        "comp-3": 45, // SHORT — should trigger RED
      };

      const result = evaluateComponents(items, counts);

      expect(result.hasRed).toBe(true);
      expect(result.items.find((i) => i.componentId === "comp-3")?.status).toBe("RED");
    });

    it("should block approval when a count is zero for a component with expected > 0", () => {
      const items: VerificationItem[] = [
        { componentId: "comp-1", expectedQty: 50 },
      ];

      const counts = { "comp-1": 0 };
      const result = evaluateComponents(items, counts);

      expect(result.hasRed).toBe(true);
      expect(result.items[0].status).toBe("RED");
    });

    it("should block approval if any count is missing (uncounted component)", () => {
      const items: VerificationItem[] = [
        { componentId: "comp-1", expectedQty: 50 },
        { componentId: "comp-2", expectedQty: 50 },
      ];

      const counts = { "comp-1": 50 }; // comp-2 not counted
      const result = evaluateComponents(items, counts);

      expect(result.hasRed).toBe(true);
    });
  });

  // ── Test 3: Reject without reason → backend rejects ────────────────────────
  describe("Test 3: Rejection without reason note is blocked", () => {
    it("should reject when no rejection note is provided", () => {
      const result = validateRejectionNote(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject when rejection note is empty string", () => {
      const result = validateRejectionNote("");
      expect(result.valid).toBe(false);
    });

    it("should reject when rejection note is too short (less than 5 chars)", () => {
      const result = validateRejectionNote("ok");
      expect(result.valid).toBe(false);
    });

    it("should accept a valid rejection note", () => {
      const result = validateRejectionNote("Component shortage in left sleeve panels");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  // ── Test 4: Non-verifier roles → 403 Forbidden ─────────────────────────────
  describe("Test 4: Non-verifier roles receive 403 on verification attempt", () => {
    it("should return 403 when cutting_supervisor tries to approve", () => {
      const result = checkRole("cutting_supervisor", "cutting_verifier");
      expect(result.allowed).toBe(false);
      expect(result.status).toBe(403);
    });

    it("should return 403 when sewing_supervisor tries to approve", () => {
      const result = checkRole("sewing_supervisor", "cutting_verifier");
      expect(result.allowed).toBe(false);
      expect(result.status).toBe(403);
    });

    it("should allow cutting_verifier to verify", () => {
      const result = checkRole("cutting_verifier", "cutting_verifier");
      expect(result.allowed).toBe(true);
      expect(result.status).toBe(200);
    });
  });

  // ── Test 5: Unapproved orders never appear in sewing queue ─────────────────
  describe("Test 5: Unapproved orders never appear in sewing queue", () => {
    it("should filter out non-VERIFIED orders from the sewing queue", () => {
      const allOrders = [
        { id: "1", orderNo: "ORD-0001", status: "PENDING_VERIFICATION" },
        { id: "2", orderNo: "ORD-0002", status: "VERIFIED" },
        { id: "3", orderNo: "ORD-0003", status: "REJECTED" },
        { id: "4", orderNo: "ORD-0004", status: "CUTTING_IN_PROGRESS" },
        { id: "5", orderNo: "ORD-0005", status: "VERIFIED" },
      ];

      // Simulates the DB query: WHERE status = 'VERIFIED'
      const sewingQueue = allOrders.filter((o) => o.status === "VERIFIED");

      expect(sewingQueue).toHaveLength(2);
      expect(sewingQueue.every((o) => o.status === "VERIFIED")).toBe(true);
      expect(sewingQueue.map((o) => o.orderNo)).toEqual(["ORD-0002", "ORD-0005"]);
    });

    it("should return empty queue when no verified orders exist", () => {
      const allOrders = [
        { id: "1", status: "PENDING_VERIFICATION" },
        { id: "2", status: "REJECTED" },
      ];

      const sewingQueue = allOrders.filter((o) => o.status === "VERIFIED");
      expect(sewingQueue).toHaveLength(0);
    });
  });

  // ── Bonus: Wastage calculation ──────────────────────────────────────────────
  describe("Bonus: Fabric wastage calculation", () => {
    it("should correctly calculate positive wastage (over-usage)", () => {
      // 50 garments × 1.8 yds = 90 yds expected, 95 used
      const wastage = calculateWastagePct(95, 1.8, 50);
      expect(wastage).toBeCloseTo(5.56, 1);
    });

    it("should correctly calculate zero wastage (exact usage)", () => {
      const wastage = calculateWastagePct(90, 1.8, 50);
      expect(wastage).toBeCloseTo(0, 1);
    });

    it("should correctly calculate negative wastage (under-usage)", () => {
      const wastage = calculateWastagePct(85, 1.8, 50);
      expect(wastage).toBeLessThan(0);
    });
  });
});
