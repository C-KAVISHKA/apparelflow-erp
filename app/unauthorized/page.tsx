import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0f1e", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px" }}>
      <div style={{ fontSize: "60px" }}>🚫</div>
      <h1 style={{ color: "#ef4444", fontSize: "28px", fontWeight: "800", margin: 0 }}>Access Denied</h1>
      <p style={{ color: "#64748b", fontSize: "16px" }}>You don&apos;t have permission to view this page.</p>
      <Link href="/login" style={{ background: "#3b82f6", color: "#fff", borderRadius: "8px", padding: "10px 24px", textDecoration: "none", fontWeight: "600" }}>
        Back to Login
      </Link>
    </div>
  );
}
