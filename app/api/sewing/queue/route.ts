import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/sewing/queue - Sewing supervisor view: ONLY VERIFIED orders
export async function GET() {
  const session = await auth();

  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "sewing_supervisor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── QUERY ISOLATION: WHERE enforced at DB level, never from client params ──
  const orders = await prisma.cuttingOrder.findMany({
    where: { status: "VERIFIED" }, // Hard-coded — manipulating URL cannot bypass this
    include: {
      recipe: true,
      creator: { select: { fullName: true } },
      verificationItems: { include: { component: true } },
      verificationLogs: {
        include: { verifier: { select: { fullName: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(orders);
}
