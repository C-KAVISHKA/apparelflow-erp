/**
 * Integration tests that call the REAL Next.js route handlers.
 * Only the session (auth) and database (prisma) are mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
 
const mockAuth = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => ({
  cuttingOrder: { findUnique: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
  verificationItem: { update: vi.fn() },
  verificationLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));
 
vi.mock("@/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
 
import { POST as approve } from "@/app/api/verify/[orderId]/approve/route";
import { POST as reject } from "@/app/api/verify/[orderId]/reject/route";
import { GET as sewingQueue } from "@/app/api/sewing/queue/route";
 
const asUser = (role: string) =>
  mockAuth.mockResolvedValue({ user: { id: `${role}-id`, role } });
 
const call = (handler: any, body: unknown) =>
  handler(
    new Request("http://test/api", { method: "POST", body: JSON.stringify(body) }),
    { params: Promise.resolve({ orderId: "ord1" }) }
  );
 
const pendingOrder = {
  id: "ord1",
  status: "PENDING_VERIFICATION",
  targetQty: 50,
  actualFabricYds: 92,
  recipe: { stdFabricYards: 1.8 },
  verificationItems: [
    { id: "i1", componentId: "c1", expectedQty: 50 },
    { id: "i2", componentId: "c2", expectedQty: 100 },
  ],
};
 
beforeEach(() => {
  vi.clearAllMocks();
  db.cuttingOrder.findUnique.mockResolvedValue(pendingOrder);
  db.cuttingOrder.updateMany.mockReturnValue("upd");
  db.$transaction.mockImplementation(async () => [{ count: 1 }]);
});
 
describe("API: approve / reject / sewing queue", () => {
  it("Test 1: all-GREEN order is approved by a verifier and audit uses the SESSION user id", async () => {
    asUser("cutting_verifier");
    const res = await call(approve, { counts: { c1: 50, c2: 100 }, verifierId: "attacker" });
    expect(res.status).toBe(200);
    const logArg = db.verificationLog.create.mock.calls[0][0].data;
    expect(logArg.verifierId).toBe("cutting_verifier-id"); // not "attacker"
    expect(logArg.decision).toBe("APPROVED");
  });
 
  it("Test 2: a RED (shortage) component is rejected with 422 and nothing is written", async () => {
    asUser("cutting_verifier");
    const res = await call(approve, { counts: { c1: 50, c2: 99 } });
    expect(res.status).toBe(422);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
 
  it("Test 2b: an uncounted component also returns 422", async () => {
    asUser("cutting_verifier");
    const res = await call(approve, { counts: { c1: 50 } });
    expect(res.status).toBe(422);
  });
 
  it("Test 3: rejecting without a reason note returns 400", async () => {
    asUser("cutting_verifier");
    for (const note of [undefined, "", "   ", "abc"]) {
      const res = await call(reject, { rejectionNote: note });
      expect(res.status).toBe(400);
    }
    expect(db.$transaction).not.toHaveBeenCalled();
  });
 
  it("Test 4: non-verifier roles get 403 on approve and reject", async () => {
    for (const role of ["cutting_supervisor", "sewing_supervisor"]) {
      asUser(role);
      expect((await call(approve, { counts: { c1: 50, c2: 100 } })).status).toBe(403);
      expect((await call(reject, { rejectionNote: "bad cut edges" })).status).toBe(403);
    }
    expect(db.$transaction).not.toHaveBeenCalled();
  });
 
  it("Test 4b: unauthenticated request gets 401", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await call(approve, { counts: {} })).status).toBe(401);
  });
 
  it("Test 5: sewing queue query is hard-filtered to status VERIFIED", async () => {
    asUser("sewing_supervisor");
    db.cuttingOrder.findMany.mockResolvedValue([]);
    const res = await sewingQueue();
    expect(res.status).toBe(200);
    expect(db.cuttingOrder.findMany.mock.calls[0][0].where).toEqual({ status: "VERIFIED" });
  });
 
  it("Test 5b: other roles cannot read the sewing queue", async () => {
    asUser("cutting_supervisor");
    expect((await sewingQueue()).status).toBe(403);
    expect(db.cuttingOrder.findMany).not.toHaveBeenCalled();
  });
});
