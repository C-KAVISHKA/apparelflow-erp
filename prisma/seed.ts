import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Seed Users ───────────────────────────────────────────────────────────
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

  // ─── Seed Recipe A: Casual Blouse ─────────────────────────────────────────
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
  });

  // ─── Seed Recipe B: Crop Top ──────────────────────────────────────────────
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
  });

  console.log("✅ Recipes seeded:", blouse.name, cropTop.name);
  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
