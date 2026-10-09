import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { validateCuttingOrderInput } from "@/lib/domain";

// GET /api/orders - Get all cutting orders for the supervisor
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "cutting_supervisor") {
    return NextResponse.json({ error: "Forbidden: Only cutting supervisors can view all orders" }, { status: 403 });
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
    return NextResponse.json({ error: "Forbidden: Only cutting supervisors can create orders" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const validation = validateCuttingOrderInput({
    recipeId: body.recipeId,
    targetQty: body.targetQty,
    fabricRollId: body.fabricRollId,
    actualFabricYds: body.actualFabricYds,
  });

  if (!validation.valid || !validation.data) {
    const firstError = Object.values(validation.errors)[0] || "Invalid input";
    return NextResponse.json({ error: firstError, errors: validation.errors }, { status: 400 });
  }

  const { recipeId, targetQty, fabricRollId, actualFabricYds } = validation.data;

  // Get recipe components to create verification items
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { components: true },
  });

  if (!recipe) return NextResponse.json({ error: "Production recipe not found" }, { status: 404 });

  let order;
  for (let attempt = 0; attempt < 5; attempt++) {
    const orderCount = await prisma.cuttingOrder.count();
    const orderNo = `ORD-${new Date().getFullYear()}-${String(orderCount + 1 + attempt).padStart(4, "0")}`;
    try {
      order = await prisma.cuttingOrder.create({
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
      break;
    } catch (e: unknown) {
      const isUniqueClash = (e as { code?: string })?.code === "P2002";
      if (!isUniqueClash || attempt === 4) throw e;
      // unique-constraint clash on orderNo: loop and try the next number
    }
  }

  return NextResponse.json(order, { status: 201 });
}
