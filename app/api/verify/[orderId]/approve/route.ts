import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/verify/[orderId]/approve - Approve a verified batch
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();

  // ── SECURITY: Server-side role check ──────────────────────────────────────
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "cutting_verifier") {
    return NextResponse.json({ error: "Forbidden: Only cutting verifiers can approve batches" }, { status: 403 });
  }

  const { orderId } = await params;
  const body = await req.json();
  const { counts } = body; // { [componentId]: actualQty }

  if (!counts || typeof counts !== "object") {
    return NextResponse.json({ error: "Component counts are required" }, { status: 400 });
  }

  // Load order
  const order = await prisma.cuttingOrder.findUnique({
    where: { id: orderId },
    include: {
      recipe: true,
      verificationItems: { include: { component: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "PENDING_VERIFICATION") {
    return NextResponse.json({ error: "Order is not pending verification" }, { status: 422 });
  }

  // ── Evaluate each component ───────────────────────────────────────────────
  const itemUpdates = order.verificationItems.map((item) => {
    const actualQty = counts[item.componentId];

    // Validate input
    if (actualQty === undefined || actualQty === null || actualQty === "") {
      return { ...item, actualQty: 0, status: "RED" as const };
    }
    const qty = Number(actualQty);
    if (isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
      return { ...item, actualQty: 0, status: "RED" as const };
    }

    let status: "GREEN" | "YELLOW" | "RED";
    if (qty === item.expectedQty) status = "GREEN";
    else if (qty > item.expectedQty) status = "YELLOW";
    else status = "RED";

    return { ...item, actualQty: qty, status };
  });

  // ── HARD STOP: Block if any RED ───────────────────────────────────────────
  const hasRed = itemUpdates.some((i) => i.status === "RED");
  if (hasRed) {
    return NextResponse.json(
      { error: "Cannot approve: one or more components have a shortage (RED). Reject the batch instead." },
      { status: 422 }
    );
  }

  // ── Calculate fabric wastage % ────────────────────────────────────────────
  const expectedFabric = order.recipe.stdFabricYards * order.targetQty;
  const wastagePct = ((order.actualFabricYds - expectedFabric) / expectedFabric) * 100;

  // ── Write immutable audit + update items atomically ───────────────────────
  await prisma.$transaction([
    // Update all verification items
    ...itemUpdates.map((item) =>
      prisma.verificationItem.update({
        where: { id: item.id },
        data: { actualQty: item.actualQty, status: item.status },
      })
    ),
    // Write immutable audit log (verifier ID from server session - never from client)
    prisma.verificationLog.create({
      data: {
        orderId,
        verifierId: session.user.id, // NEVER from request body
        decision: "APPROVED",
        wastagePct: Math.round(wastagePct * 100) / 100,
      },
    }),
    // Transition order to VERIFIED
    prisma.cuttingOrder.update({
      where: { id: orderId },
      data: { status: "VERIFIED" },
    }),
  ]);

  return NextResponse.json({ success: true, message: "Batch approved and released to sewing queue" });
}
