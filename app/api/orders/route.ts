import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/orders - Get all cutting orders for the supervisor
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "cutting_supervisor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orders = await prisma.cuttingOrder.findMany({
    include: {
      recipe: true,
      creator: { select: { fullName: true } },
      verificationLogs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

// POST /api/orders - Create a new cutting order
export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "cutting_supervisor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { recipeId, targetQty, fabricRollId, actualFabricYds } = body;

  // Input validation
  if (!recipeId || !targetQty || !fabricRollId || !actualFabricYds) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }
  if (targetQty <= 0 || actualFabricYds <= 0) {
    return NextResponse.json({ error: "Quantities must be positive numbers" }, { status: 400 });
  }
  if (!Number.isInteger(targetQty)) {
    return NextResponse.json({ error: "Target quantity must be a whole number" }, { status: 400 });
  }

  // Generate order number
  const orderCount = await prisma.cuttingOrder.count();
  const orderNo = `ORD-${String(orderCount + 1).padStart(4, "0")}`;

  // Get recipe components to create verification items
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { components: true },
  });

  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

  // Create order with verification items (multiplier engine)
  const order = await prisma.cuttingOrder.create({
    data: {
      orderNo,
      recipeId,
      targetQty,
      fabricRollId,
      actualFabricYds,
      createdBy: session.user.id,
      status: "PENDING_VERIFICATION",
      verificationItems: {
        create: recipe.components.map((comp) => ({
          componentId: comp.id,
          expectedQty: comp.piecesPerGarment * targetQty, // Multiplier engine
          actualQty: null,
          status: "PENDING",
        })),
      },
    },
    include: { recipe: true, verificationItems: true },
  });

  return NextResponse.json(order, { status: 201 });
}
