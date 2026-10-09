import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── 1. Seed Users ──────────────────────────────────────────────────────────
  const password = await bcrypt.hash("Password123!", 10);

  const supervisor = await prisma.user.upsert({
    where: { email: "supervisor@apparelflow.com" },
    update: {},
    create: {
      email: "supervisor@apparelflow.com",
      passwordHash: password,
      fullName: "Alex Supervisor",
      role: "cutting_supervisor",
    },
  });

  const verifier = await prisma.user.upsert({
    where: { email: "verifier@apparelflow.com" },
    update: {},
    create: {
      email: "verifier@apparelflow.com",
      passwordHash: password,
      fullName: "Sam Verifier",
      role: "cutting_verifier",
    },
  });

  const sewingSupervisor = await prisma.user.upsert({
    where: { email: "sewing@apparelflow.com" },
    update: {},
    create: {
      email: "sewing@apparelflow.com",
      passwordHash: password,
      fullName: "Jordan Sewing",
      role: "sewing_supervisor",
    },
  });

  console.log("✅ Users seeded:", supervisor.email, verifier.email, sewingSupervisor.email);

  // ─── 2. Seed Recipe A: Casual Blouse ────────────────────────────────────────
  const blouse = await prisma.recipe.upsert({
    where: { recipeCode: "REC-BL01" },
    update: {},
    create: {
      recipeCode: "REC-BL01",
      name: "Casual Blouse",
      category: "Blouse",
      stdFabricYards: 1.8,
      wastageCap: 5.0,
      components: {
        create: [
          { componentName: "Front Body Panel", piecesPerGarment: 1 },
          { componentName: "Back Body Panel", piecesPerGarment: 1 },
          { componentName: "Left Sleeve", piecesPerGarment: 1 },
          { componentName: "Right Sleeve", piecesPerGarment: 1 },
          { componentName: "Collar & Stand", piecesPerGarment: 1 },
          { componentName: "Sleeve Cuffs", piecesPerGarment: 2 },
        ],
      },
    },
    include: { components: true },
  });

  // ─── 3. Seed Recipe B: Crop Top ─────────────────────────────────────────────
  const cropTop = await prisma.recipe.upsert({
    where: { recipeCode: "REC-CT02" },
    update: {},
    create: {
      recipeCode: "REC-CT02",
      name: "Crop Top",
      category: "Crop Top",
      stdFabricYards: 1.1,
      wastageCap: 8.0,
      components: {
        create: [
          { componentName: "Front Chest Panel", piecesPerGarment: 1 },
          { componentName: "Back Support Panel", piecesPerGarment: 1 },
          { componentName: "Neck Binding Strip", piecesPerGarment: 1 },
          { componentName: "Hem Elastic Casing", piecesPerGarment: 1 },
          { componentName: "Side Strap Accents", piecesPerGarment: 2 },
        ],
      },
    },
    include: { components: true },
  });

  console.log("✅ Recipes seeded:", blouse.name, cropTop.name);

  // ─── 4. Seed Representative Production Batches for Evaluator Demo ───────────

  // Batch 1: PENDING_VERIFICATION (Crop Top, 50 units)
  const order1 = await prisma.cuttingOrder.upsert({
    where: { orderNo: "ORD-2026-001" },
    update: {},
    create: {
      orderNo: "ORD-2026-001",
      recipeId: cropTop.id,
      targetQty: 50,
      fabricRollId: "FAB-ROLL-101",
      actualFabricYds: 56.5,
      status: "PENDING_VERIFICATION",
      createdBy: supervisor.id,
      verificationItems: {
        create: cropTop.components.map((c) => ({
          componentId: c.id,
          expectedQty: c.piecesPerGarment * 50,
          status: "PENDING",
        })),
      },
    },
  });

  // Batch 2: REJECTED (Casual Blouse with Rejection Feedback)
  const order2 = await prisma.cuttingOrder.upsert({
    where: { orderNo: "ORD-2026-002" },
    update: {},
    create: {
      orderNo: "ORD-2026-002",
      recipeId: blouse.id,
      targetQty: 100,
      fabricRollId: "FAB-ROLL-204",
      actualFabricYds: 185.0,
      status: "REJECTED",
      createdBy: supervisor.id,
      verificationItems: {
        create: blouse.components.map((c) => {
          const expected = c.piecesPerGarment * 100;
          const isDefect = c.componentName === "Left Sleeve";
          return {
            componentId: c.id,
            expectedQty: expected,
            actualQty: isDefect ? expected - 8 : expected,
            status: isDefect ? "RED" : "GREEN",
          };
        }),
      },
      verificationLogs: {
        create: {
          verifierId: verifier.id,
          decision: "REJECTED",
          rejectionNote: "QC DEFECT: 8 pieces shortage on Left Sleeve panel. Edge frayed during cutting. Rework required.",
        },
      },
    },
  });

  // Batch 3: VERIFIED (Casual Blouse Ready for Sewing Queue)
  const order3 = await prisma.cuttingOrder.upsert({
    where: { orderNo: "ORD-2026-003" },
    update: {},
    create: {
      orderNo: "ORD-2026-003",
      recipeId: blouse.id,
      targetQty: 75,
      fabricRollId: "FAB-ROLL-309",
      actualFabricYds: 137.0, // Expected: 1.8 * 75 = 135 -> +1.48% wastage (under 5% cap)
      status: "VERIFIED",
      createdBy: supervisor.id,
      verificationItems: {
        create: blouse.components.map((c) => ({
          componentId: c.id,
          expectedQty: c.piecesPerGarment * 75,
          actualQty: c.piecesPerGarment * 75,
          status: "GREEN",
        })),
      },
      verificationLogs: {
        create: {
          verifierId: verifier.id,
          decision: "APPROVED",
          wastagePct: 1.48,
        },
      },
    },
  });

  console.log("✅ Evaluator Demo Batches Seeded:", order1.orderNo, order2.orderNo, order3.orderNo);
  console.log("🎉 Complete database seeding finished!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
