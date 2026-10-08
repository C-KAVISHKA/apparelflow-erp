import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/verify/queue - Get all pending verification orders for the verifier
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "cutting_verifier") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orders = await prisma.cuttingOrder.findMany({
    where: { status: "PENDING_VERIFICATION" },
    include: {
      recipe: true,
      creator: { select: { fullName: true } },
      verificationItems: {
        include: { component: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(orders);
}
