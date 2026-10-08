# AI Optimization Report
## ApparelFlow ERP — Cutting Operations & Gatekeeper Verification Terminal

---

## 1. Tools & Prompting

The following AI tools were used during development:

| Tool | Purpose |
|------|---------|
| **Claude (Anthropic)** | Initial schema design, API route scaffolding, component structure suggestions |
| **GitHub Copilot** | Inline code completion for repetitive boilerplate (Prisma queries, form handlers) |
| **ChatGPT (GPT-4o)** | Reviewing test case coverage, clarifying NextAuth v5 session callback structure |

### Prompting Approach

Rather than prompting for complete files, I used AI for specific sub-tasks:
- "Design a Prisma schema for cutting orders with verification state tracking"
- "Generate Vitest test cases for a traffic-light component evaluation function"
- "Explain NextAuth v5 JWT callback structure for storing custom claims"

Each AI output was reviewed, refactored, and hardened before use.

---

## 2. Flawed / Broken AI Code Identified

### Flaw 1: Client-Side RBAC Bypass (Critical Security Bug)

**What AI generated:**
```typescript
// AI-generated code — INSECURE
// app/dashboard/verifier/page.tsx
"use client";

export default function VerifierPage() {
  const { data: session } = useSession();

  // AI hid the button, but never protected the API
  if (session?.user?.role !== "cutting_verifier") {
    return <div>Access denied</div>;
  }

  const handleApprove = async () => {
    // Called /api/verify/approve with NO server-side role check
    await fetch("/api/verify/approve", { method: "POST", body: ... });
  };
}
```

**Why it was broken:**
The AI implemented RBAC purely on the client — hiding the button based on `session.user.role`. However, evaluators testing via Postman/cURL could bypass the UI entirely and send POST requests directly to `/api/verify/approve` as any user. The API route had no server-side role validation.

**My fix:**
Added explicit server-side role enforcement in every API route handler:
```typescript
// FIXED — server/api enforce role from session, never client
const session = await auth();
if (session.user.role !== "cutting_verifier") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```
Also moved the page to a Server Component that validates the session before rendering, and added `middleware.ts` with edge-level route protection.

---

### Flaw 2: Missing Hard-Stop on Approval API (Business Logic Bug)

**What AI generated:**
```typescript
// AI-generated approve handler — MISSING hard stop
export async function POST(req, { params }) {
  const { counts } = await req.json();
  
  // AI just saved counts and marked as VERIFIED — no RED check!
  await prisma.cuttingOrder.update({
    where: { id: params.orderId },
    data: { status: "VERIFIED" }
  });
  
  return NextResponse.json({ success: true });
}
```

**Why it was broken:**
The AI generated an approval handler that saved component counts and immediately set the order to `VERIFIED` — without ever checking if any component was RED (shortage). This is the single most critical requirement in the entire spec. An evaluator submitting a direct API call could approve a batch with zero components counted.

**My fix:**
Added explicit shortage evaluation before any approval is processed:
```typescript
// FIXED — evaluate every component before allowing approval
const hasRed = itemUpdates.some((i) => i.status === "RED");
if (hasRed) {
  return NextResponse.json(
    { error: "Cannot approve: shortage detected" },
    { status: 422 }
  );
}
```

---

### Flaw 3: White-on-White Input Contrast (Accessibility Bug)

**What AI generated:**
The AI-generated Tailwind CSS styling used `input` default styles which rendered white text on a white background in the browser's light mode override — exactly the "white-on-white" defect the task warned about.

**My fix:**
Wrote explicit `input, select, textarea` global CSS rules enforcing dark backgrounds and light text:
```css
input, select, textarea {
  background-color: #1e293b !important;
  color: #f1f5f9 !important;
  border: 1px solid #334155 !important;
}
```
Used `!important` to prevent browser stylesheet overrides.

---

### Flaw 4: Verifier ID Trusted from Request Body (Security Bug)

**What AI generated:**
```typescript
// AI used verifier ID from the client request body — INSECURE
const { verifierId, rejectionNote } = await req.json();
await prisma.verificationLog.create({
  data: { verifierId, ... } // Anyone could spoof any verifier's ID
});
```

**Why it was broken:**
Trusting the `verifierId` from the client request body allows any authenticated user to forge audit logs under another user's identity. An evaluator could approve a batch appearing to be signed off by a different user.

**My fix:**
The verifier ID is always derived from the server-side JWT session, never from the request body:
```typescript
// FIXED — identity always from server session
verifierId: session.user.id, // Never from req.json()
```

---

## 3. Human Refactoring

Beyond catching AI bugs, I made the following architectural improvements:

### State Machine Enforcement
AI tended to allow any status transition. I added explicit state guards:
```typescript
if (order.status !== "PENDING_VERIFICATION") {
  return NextResponse.json({ error: "Order is not pending verification" }, { status: 422 });
}
```

### Atomic Database Transactions
AI generated sequential Prisma queries that could leave the DB in a partial state (e.g., items updated but order status not changed). I wrapped all state transitions in `prisma.$transaction([...])` to ensure atomicity.

### Input Validation Hardening
AI-generated forms accepted negative numbers and decimals for component counts. I added:
- Rejection of negative numbers at input level
- Rejection of decimal counts (`!Number.isInteger(qty)`)
- Rejection of empty payloads with meaningful error messages

### Query Isolation
AI's initial sewing queue endpoint used a URL query parameter: `GET /api/sewing/queue?status=VERIFIED`. This would allow URL manipulation to leak other orders. I hardcoded `WHERE status = 'VERIFIED'` at the Prisma query level.

---

## 4. Defensive Architecture

### State Machine Guards
Every API endpoint validates the order's current state before allowing transitions:
- Only `PENDING_VERIFICATION` orders can be approved or rejected
- Only `VERIFIED` orders can be started for sewing
- Each transition is atomic via `prisma.$transaction`

### Multi-Layer Security Model
```
Layer 1: middleware.ts       → Edge-level route blocking (fastest)
Layer 2: Page server components → Session validation before render
Layer 3: API route handlers  → Role + state validation on every request
Layer 4: Database queries    → Status filters enforced at query level
```

### Immutable Audit Trail
`verification_logs` records are write-once. No UPDATE operations exist on this table. The verifier's identity, timestamp, component variances, and wastage percentage are permanently recorded at the moment of approval.

### Never-Trust-Client Principle
- Verifier ID → from `session.user.id` (JWT), never request body
- Order status → read from DB, never from client
- Sewing queue filter → `WHERE status = 'VERIFIED'` in Prisma, not URL params

---

*This report documents genuine AI collaboration and honest engineering judgment applied to harden AI-generated code to production standards.*
