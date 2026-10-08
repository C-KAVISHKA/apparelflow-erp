import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/verify/[orderId]/reject - Reject a batch with mandatory reason
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();

  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "cutting_verifier") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orderId } = await params;
  const body = await req.json();
  const { rejectionNote, counts } = body;

  // ── Mandatory reason validation ───────────────────────────────────────────
  if (!rejectionNote || typeof rejectionNote !== "string" || rejectionNote.trim().length < 5) {
    return NextResponse.json(
      { error: "A rejection reason of at least 5 characters is required" },
      { status: 400 }
    );
  }

  const order = await prisma.cuttingOrder.findUnique({
    where: { id: orderId },
    include: { verificationItems: true },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "PENDING_VERIFICATION") {
    return NextResponse.json({ error: "Order is not pending verification" }, { status: 422 });
  }

  // Update verification items if counts were provided
  const itemUpdates =
    counts && typeof counts === "object"
      ? order.verificationItems
          .filter((item) => counts[item.componentId] !== undefined)
          .map((item) => {
            const qty = Number(counts[item.componentId]);
            let status: "GREEN" | "YELLOW" | "RED" | "PENDING" = "PENDING";
            if (!isNaN(qty) && qty >= 0) {
              if (qty === item.expectedQty) status = "GREEN";
              else if (qty > item.expectedQty) status = "YELLOW";
              else status = "RED";
            }
            return prisma.verificationItem.update({
              where: { id: item.id },
              data: { actualQty: isNaN(qty) ? null : qty, status },
            });
          })
      : [];

  await prisma.$transaction([
    ...itemUpdates,
    prisma.verificationLog.create({
      data: {
        orderId,
        verifierId: session.user.id,
        decision: "REJECTED",
        rejectionNote: rejectionNote.trim(),
      },
    }),
    prisma.cuttingOrder.update({
      where: { id: orderId },
      data: { status: "REJECTED" },
    }),
  ]);

  return NextResponse.json({ success: true, message: "Batch rejected and returned to supervisor" });
}
