# ApparelFlow ERP — Cutting Operations & Gatekeeper Verification Terminal

> **Live Demo:** [https://apparelflow-erp-one.vercel.app](https://apparelflow-erp-one.vercel.app)  
> **GitHub:** [https://github.com/C-KAVISHKA/apparelflow-erp](https://github.com/C-KAVISHKA/apparelflow-erp)  
> **Target Role:** Software Engineering Intern (Full-Stack / React / Next.js)  
> **Company:** Webtezza (Pvt) Ltd

---

## Overview

A production-grade, full-stack manufacturing execution application implementing the **Cutting Operations & Gatekeeper Verification Terminal** for **ApparelFlow ERP** — Webtezza's manufacturing resource planning platform for commercial garment production facilities.

Under factory standard operating procedures (SOP), **zero unverified, mismatched, or shortage batches may ever enter the high-speed Sewing Queue**. This application enforces this boundary through a server-side hard-stop gatekeeper, role-based access control (RBAC), and an immutable audit trail.

---

## Evaluation Demo Credentials

The login portal provides a one-click persona switcher and manual authentication for all three required factory roles:

| Role | Email | Password | Access Rights & Separation of Duties |
|:---|:---|:---|:---|
| **Cutting Supervisor** | `supervisor@apparelflow.com` | `Password123!` | Create cutting orders from BOM recipes, log roll lots/yardage, view re-cut feedback |
| **Quality Verifier** | `verifier@apparelflow.com` | `Password123!` | Gatekeeper terminal, physical piece counts, approve/reject hard-stop enforcement |
| **Sewing Supervisor** | `sewing@apparelflow.com` | `Password123!` | Verified assembly queue, verifier audit note inspection, initiate line assembly |

---

## Tech Stack

| Layer | Technology |
|:---|:---|
| **Framework** | Next.js 16 (App Router + Server Components) |
| **Language** | TypeScript (Strict mode) |
| **Authentication & RBAC** | NextAuth.js v5 (JWT session strategy + Edge Middleware) |
| **Database** | PostgreSQL via Neon Cloud Serverless |
| **ORM** | Prisma ORM 5.x |
| **Design System** | Tailwind CSS v4 + PostCSS + Custom High-Contrast Tokens + Lucide SVGs |
| **Testing** | Vitest (Automated unit & domain rule suite) |
| **Deployment Target** | Vercel |

---

## Architecture & Security Model

```
apparelflow-erp/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   ← NextAuth v5 session handler
│   │   ├── orders/               ← GET/POST cutting orders + BOM multiplier
│   │   ├── recipes/              ← GET recipes + component Bill of Materials
│   │   ├── verify/
│   │   │   ├── queue/            ← GET FIFO pending QC verification list
│   │   │   └── [orderId]/
│   │   │       ├── approve/      ← POST approve (Server-enforced Hard Stop)
│   │   │       └── reject/       ← POST reject (Mandatory reason note)
│   │   └── sewing/
│   │       ├── queue/            ← GET WHERE status = 'VERIFIED' only
│   │       └── [orderId]/start/  ← POST initiate sewing line
│   ├── dashboard/
│   │   ├── supervisor/           ← Cutting Operations Terminal UI
│   │   ├── verifier/             ← QC Verification Station UI
│   │   └── sewing/               ← Verified Assembly Queue UI
│   └── login/                    ← High-contrast Auth Portal + Quick Persona Selector
├── lib/
│   ├── domain.ts                 ← Central domain engine (traffic lights, wastage, validation)
│   └── prisma.ts                 ← Singleton Prisma database client
├── prisma/
│   ├── schema.prisma             ← PostgreSQL relational schema
│   └── seed.ts                   ← Production recipes & test user seeder
├── middleware.ts                 ← Edge-level RBAC route protection
├── auth.ts                       ← NextAuth configuration & credentials provider
├── tests/
│   ├── domain.test.ts            ← Domain engine unit tests (14 tests: traffic-light, BOM, wastage)
│   └── api.test.ts               ← Real Next.js route integration tests (8 tests: RBAC, hard-stop, audit)
└── AI_OPTIMIZATION_REPORT.md     ← AI collaboration, defect log & defensive design
```

### Multi-Layer Security Boundary

1. **Edge Route Guard (`middleware.ts`)**: Rejects unauthenticated requests and restricts role-specific URL paths before rendering.
2. **Server Component Guards**: Dashboard server pages validate JWT session claims before mounting client components.
3. **Server-Side API Hard-Stops**: Every endpoint independently verifies role permissions (`403 Forbidden`) and state conditions (`422 Unprocessable Entity`). Even if a client bypasses the UI, invalid batches cannot be approved.
4. **Query Isolation**: The Sewing Queue query strictly enforces `WHERE status = 'VERIFIED'` at the database level.
5. **Session Identity Binding**: Verifier user IDs and audit timestamps are read directly from the verified server JWT session — never trusted from request payloads.

---

## UI Contrast & Accessibility (Zero-Tolerance Compliance)

The user interface adheres to strict enterprise accessibility and ergonomics guidelines:
* **Industrial High-Contrast Inputs**: All text fields, numeric counters, search bars, and dropdowns use high-contrast deep navy backgrounds (`#0b1322` / `#1e293b`) paired with crisp white text (`#f8fafc`).
* **WCAG AAA 17.2:1 Measured Ratio**: While standard specifications mention dark text on light backgrounds, our industrial high-density UI was engineered for low-glare garment factory terminals with a measured contrast ratio of **17.2:1** — far exceeding the WCAG AAA requirement (7:1) and completely eliminating white-on-white text defects.
* **Distinct Visual States**: Inputs feature explicit focus rings (`#3b82f6` with 3px focus outline) and unmistakable traffic-light badge styling (Green: `#10b981`, Amber: `#f59e0b`, Red: `#f43f5e`).

---

## Relational Database Schema

```
users:               id, email, passwordHash, fullName, role, createdAt
recipes:             id, recipeCode, name, category, stdFabricYards, wastageCap
recipe_components:   id, recipeId, componentName, piecesPerGarment
cutting_orders:      id, orderNo, recipeId, targetQty, fabricRollId, actualFabricYds, status, createdBy, createdAt
verification_items:  id, orderId, componentId, expectedQty, actualQty, status (GREEN/YELLOW/RED/PENDING)
verification_logs:   id, orderId, verifierId, decision (APPROVED/REJECTED), rejectionNote, wastagePct, createdAt [IMMUTABLE]
```

### Manufacturing State Machine

```
[CUTTING_IN_PROGRESS] ──(Supervisor logs batch)──► [PENDING_VERIFICATION]
                                                           │
                                             ┌─────────────┴─────────────┐
                                      (Shortage / Defect)          (All Valid / Match)
                                             │                             │
                                             ▼                             ▼
                                        [REJECTED]                     [VERIFIED]
                               (Mandatory note returned)                   │
                                                                           ▼
                                                                [SEWING_IN_PROGRESS]
```

---

## Pre-Seeded Production Recipes (Bill of Materials)

1. **Casual Blouse (`REC-BL01`)**
   - Category: Blouse | Std Fabric: 1.8 yds/pc | Wastage Cap: 5.0%
   - Components: Front Body Panel (1), Back Body Panel (1), Sleeves (2), Collar & Stand (1), Sleeve Cuffs (2)
2. **Crop Top (`REC-CT02`)**
   - Category: Crop Top | Std Fabric: 1.1 yds/pc | Wastage Cap: 8.0%
   - Components: Front Chest Panel (1), Back Support Panel (1), Neck Binding Strip (1), Hem Elastic Casing (1), Side Strap Accents (2)

---

## Automated Test Suite (22/22 Passing)

Run the automated test suite verifying all 5 required core domain rules and real API routes:

```bash
npm test
```

### Test Suite Breakdown:

#### 1. Domain Engine Unit Tests (`tests/domain.test.ts` — 14 tests)
- **Component Evaluation**: Accurate `GREEN` (match), `YELLOW` (excess), and `RED` (shortage / invalid count) evaluation.
- **BOM Gatekeeper Engine**: Multi-component evaluation setting `hasRed = true` for hard-stop blocking.
- **Rejection Validation**: Enforces mandatory non-empty reason notes ($\ge 5$ characters).
- **Wastage Calculations**: Fabric consumption variance formulas and standard cap variance checks.
- **Defensive Guards**: Strict validation rejecting negative quantities, non-integers, and malformed inputs.

#### 2. Server Route Integration Tests (`tests/api.test.ts` — 8 tests)
- **Test 1**: All-GREEN batch approval by authenticated Verifier with audit logging bound to server JWT session ID.
- **Test 2 & 2b**: Shortage or uncounted components return `422 Unprocessable Entity` and block DB writes.
- **Test 3**: Rejection without explanatory note returns `400 Bad Request`.
- **Test 4 & 4b**: Non-verifier roles receive `403 Forbidden` and unauthenticated requests receive `401 Unauthorized`.
- **Test 5 & 5b**: Sewing Queue query is hard-filtered to `where: { status: "VERIFIED" }` and isolated from unauthorized roles.

---

## Local Setup & Development

```bash
# 1. Clone repository
git clone https://github.com/C-KAVISHKA/apparelflow-erp.git
cd apparelflow-erp

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local

# 4. Push database schema & seed initial recipes/users
npm run db:push
npm run db:seed

# 5. Run tests
npm test

# 6. Start development server
npm run dev
```

---

*Engineered for Webtezza (Pvt) Ltd — ApparelFlow ERP Challenge*
