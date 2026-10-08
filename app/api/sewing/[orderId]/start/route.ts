import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/sewing/[orderId]/start - Start sewing assembly
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();

  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "sewing_supervisor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orderId } = await params;

  const order = await prisma.cuttingOrder.findUnique({ where: { id: orderId } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "VERIFIED") {
    return NextResponse.json({ error: "Only VERIFIED batches can start sewing" }, { status: 422 });
  }

  await prisma.cuttingOrder.update({
    where: { id: orderId },
    data: { status: "SEWING_IN_PROGRESS" },
  });

  return NextResponse.json({ success: true, message: "Sewing assembly started" });
}
