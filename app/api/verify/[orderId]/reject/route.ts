import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { validateRejectionNote, evaluateComponentCount } from "@/lib/domain";

// POST /api/verify/[orderId]/reject - Reject a batch with mandatory reason note
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();

  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "cutting_verifier") {
    return NextResponse.json(
      { error: "Forbidden: Only cutting verifiers can reject batches" },
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

  const { rejectionNote, counts } = body;

  // ── Mandatory reason validation via domain logic ───────────────────────────
  const noteValidation = validateRejectionNote(rejectionNote);
  if (!noteValidation.valid || !noteValidation.cleanNote) {
    return NextResponse.json({ error: noteValidation.error }, { status: 400 });
  }

  const order = await prisma.cuttingOrder.findUnique({
    where: { id: orderId },
    include: { verificationItems: true },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "PENDING_VERIFICATION") {
    return NextResponse.json(
      { error: `Order cannot be rejected from status: ${order.status}` },
      { status: 422 }
    );
  }

  // Update verification items if counts were entered prior to rejection
  const countsMap = (counts && typeof counts === "object" && !Array.isArray(counts))
    ? (counts as Record<string, unknown>)
    : {};

  const outcome = await prisma.$transaction(async (tx) => {
    const upd = await tx.cuttingOrder.updateMany({
      where: { id: orderId, status: "PENDING_VERIFICATION" },
      data: { status: "REJECTED" },
    });
    if (upd.count !== 1) return { conflict: true };
   
    for (const item of order.verificationItems) {
      const rawVal = countsMap[item.componentId];
      if (rawVal !== undefined && rawVal !== null && rawVal !== "") {
        const { actualQty, status } = evaluateComponentCount(item.expectedQty, rawVal);
        await tx.verificationItem.update({
          where: { id: item.id },
          data: { actualQty, status },
        });
      }
    }
   
    await tx.verificationLog.create({
      data: {
        orderId,
        verifierId: session.user.id,
        decision: "REJECTED",
        rejectionNote: noteValidation.cleanNote!,
      },
    });
    return { conflict: false };
  });
   
  if (outcome.conflict) {
    return NextResponse.json(
      { error: "Order was concurrently updated or is no longer pending verification" },
      { status: 409 }
    );
  }
   
  return NextResponse.json({
    success: true,
    message: "Batch rejected and feedback returned to Cutting Supervisor",
  });
}
