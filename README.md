# ApparelFlow ERP — Cutting Operations & Gatekeeper Verification Terminal

> **Live Demo:** [https://apparelflow-erp.vercel.app](https://apparelflow-erp.vercel.app)
> **GitHub:** [https://github.com/C-KAVISHKA/apparelflow-erp](https://github.com/C-KAVISHKA/apparelflow-erp)

---

## Overview

A production-grade full-stack web application implementing the **Cutting Operations & Gatekeeper Verification Terminal** for ApparelFlow ERP — Webtezza's manufacturing resource planning platform for commercial garment production facilities.

---

## Demo Credentials

| Role | Email | Password | Access |
|------|-------|----------|--------|
| ✂️ Cutting Supervisor | `supervisor@apparelflow.com` | `Password123!` | Create orders, track progress |
| 🔍 Cutting Verifier | `verifier@apparelflow.com` | `Password123!` | Verify components, approve/reject |
| 🧵 Sewing Supervisor | `sewing@apparelflow.com` | `Password123!` | Sewing queue only |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Auth | NextAuth.js v5 (JWT) |
| Database | PostgreSQL via Neon (serverless) |
| ORM | Prisma |
| Styling | Tailwind CSS + Custom CSS |
| Testing | Vitest |
| Deployment | Vercel |

---

## Architecture

```
apparelflow-erp/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   ← NextAuth handler
│   │   ├── orders/               ← GET/POST cutting orders
│   │   ├── recipes/              ← GET recipes + components
│   │   ├── verify/
│   │   │   ├── queue/            ← GET pending verification list
│   │   │   └── [orderId]/
│   │   │       ├── approve/      ← POST approve (hard stop)
│   │   │       └── reject/       ← POST reject (requires reason)
│   │   └── sewing/
│   │       ├── queue/            ← GET VERIFIED-only orders
│   │       └── [orderId]/start/  ← POST start sewing
│   ├── dashboard/
│   │   ├── supervisor/           ← Cutting Supervisor UI
│   │   ├── verifier/             ← Verifier Terminal UI
│   │   └── sewing/               ← Sewing Queue UI
│   └── login/                    ← Login + Demo Panel
├── prisma/
│   ├── schema.prisma             ← Full relational schema
│   └── seed.ts                   ← Recipe + user seeder
├── middleware.ts                 ← Edge-level RBAC
├── auth.ts                       ← NextAuth configuration
├── tests/domain.test.ts          ← 5 automated tests
└── AI_OPTIMIZATION_REPORT.md
```

---

## Database Schema

```
users:               id, email, passwordHash, fullName, role, createdAt
recipes:             id, recipeCode, name, category, stdFabricYards, wastageCap
recipe_components:   id, recipeId, componentName, piecesPerGarment
cutting_orders:      id, orderNo, recipeId, targetQty, fabricRollId, actualFabricYds, status, createdBy
verification_items:  id, orderId, componentId, expectedQty, actualQty, status (GREEN/YELLOW/RED/PENDING)
verification_logs:   id, orderId, verifierId, decision, rejectionNote, wastagePct, createdAt [IMMUTABLE]
```

### Order State Machine

```
CUTTING_IN_PROGRESS → PENDING_VERIFICATION → VERIFIED → SEWING_IN_PROGRESS
                                           ↓
                                       REJECTED
```

---

## Security Model

| Layer | Mechanism |
|-------|-----------|
| Edge | middleware.ts blocks wrong-role routes before page renders |
| Page | Server Components re-validate session before rendering |
| API | Every route handler checks role + order state server-side |
| Database | Sewing queue uses WHERE status = 'VERIFIED' — cannot be bypassed via URL |
| Identity | Verifier ID always from session JWT — never from request body |

---

## Running Locally

```bash
git clone https://github.com/C-KAVISHKA/apparelflow-erp.git
cd apparelflow-erp
npm install
cp .env.example .env.local   # fill in your DATABASE_URL and NEXTAUTH_SECRET
npm run db:push
npm run db:seed
npm run dev
npm test
```

---

## Seeded Recipes

**Casual Blouse (REC-BL01)** — 1.8 yds/piece, 5% wastage cap
- Front Body Panel, Back Body Panel, Left Sleeve, Right Sleeve, Collar & Stand, Sleeve Cuffs (×2)

**Crop Top (REC-CT02)** — 1.1 yds/piece, 8% wastage cap
- Front Chest Panel, Back Support Panel, Neck Binding Strip, Hem Elastic Casing, Side Strap Accents (×2)

---

*Built for Webtezza (Pvt) Ltd — Software Engineering Intern Assessment*
