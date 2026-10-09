import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { evaluateAllComponents, calculateFabricWastagePct } from "@/lib/domain";

// POST /api/verify/[orderId]/approve - Approve a verified batch with server-enforced hard stop
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();

  // ── 1. SECURITY: Server-side RBAC ─────────────────────────────────────────
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "cutting_verifier") {
    return NextResponse.json(
      { error: "Forbidden: Only authorized cutting verifiers can approve batches" },
      { status: 403 }
    );
  }

  const { orderId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { counts } = body; // { [componentId]: actualQty }

  if (!counts || typeof counts !== "object" || Array.isArray(counts)) {
    return NextResponse.json({ error: "Component counts map is required" }, { status: 400 });
  }

  // ── 2. Load order and items ───────────────────────────────────────────────
  const order = await prisma.cuttingOrder.findUnique({
    where: { id: orderId },
    include: {
      recipe: true,
      verificationItems: { include: { component: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "PENDING_VERIFICATION") {
    return NextResponse.json(
      { error: `Order cannot be approved from current status: ${order.status}` },
      { status: 422 }
    );
  }

  // ── 3. Shared Domain Traffic-Light Evaluation ──────────────────────────────
  const expectedItems = order.verificationItems.map((item) => ({
    componentId: item.componentId,
    expectedQty: item.expectedQty,
  }));

  const evaluation = evaluateAllComponents(expectedItems, counts as Record<string, unknown>);

  // ── 4. SERVER-SIDE HARD STOP: If ANY component is RED, strictly reject ────
  if (evaluation.hasRed) {
    return NextResponse.json(
      {
        error: "HARD-STOP ACTIVE: Cannot approve batch with component shortage (RED). Batch must be rejected with feedback note.",
      },
      { status: 422 }
    );
  }

  // ── 5. Compute Fabric Wastage % ───────────────────────────────────────────
  const wastage = calculateFabricWastagePct(
    order.actualFabricYds,
    order.recipe.stdFabricYards,
    order.targetQty
  );

  // ── 6. Atomic Transaction with Race Condition Protection ───────────────────
  try {
    const [updatedOrder] = await prisma.$transaction([
      // Enforce atomic state transition where status was PENDING_VERIFICATION
      prisma.cuttingOrder.updateMany({
        where: { id: orderId, status: "PENDING_VERIFICATION" },
        data: { status: "VERIFIED" },
      }),
      // Update individual item counts
      ...evaluation.items.map((item) => {
        const matchingDbItem = order.verificationItems.find((dbItem) => dbItem.componentId === item.componentId);
        return prisma.verificationItem.update({
          where: { id: matchingDbItem!.id },
          data: { actualQty: item.actualQty, status: item.status },
        });
      }),
      // Write immutable audit log with session-derived verifier identity
      prisma.verificationLog.create({
        data: {
          orderId,
          verifierId: session.user.id, // Never trusted from request body
          decision: "APPROVED",
          wastagePct: wastage.wastagePct,
        },
      }),
    ]);

    if (updatedOrder.count === 0) {
      return NextResponse.json(
        { error: "Order was concurrently updated or is no longer pending verification" },
        { status: 409 }
      );
    }
  } catch (error) {
    console.error("Approval transaction failed:", error);
    return NextResponse.json({ error: "Database transaction failed" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: "Batch verified and released to Sewing Queue",
    wastagePct: wastage.wastagePct,
  });
}
