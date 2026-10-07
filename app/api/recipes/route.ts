import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/recipes - Get all recipes (for order creation form)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const recipes = await prisma.recipe.findMany({
    include: { components: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(recipes);
}
