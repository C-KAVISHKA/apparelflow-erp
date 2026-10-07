"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const DEMO_CREDENTIALS = [
  {
    role: "Cutting Supervisor",
    email: "supervisor@apparelflow.com",
    password: "Password123!",
    color: "#3b82f6",
    icon: "✂️",
    desc: "Create orders, log fabric",
  },
  {
    role: "Cutting Verifier",
    email: "verifier@apparelflow.com",
    password: "Password123!",
    color: "#22c55e",
    icon: "🔍",
    desc: "Count parts, approve/reject",
  },
  {
    role: "Sewing Supervisor",
    email: "sewing@apparelflow.com",
    password: "Password123!",
    color: "#a855f7",
    icon: "🧵",
    desc: "Start sewing assembly",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent, creds?: { email: string; password: string }) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const loginEmail = creds?.email || email;
    const loginPassword = creds?.password || password;

    if (!loginEmail || !loginPassword) {
      setError("Please enter your email and password.");
      setLoading(false);
      return;
    }

    const res = await signIn("credentials", {
      email: loginEmail,
      password: loginPassword,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0f1e 0%, #0f1a2e 50%, #0a0f1e 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>🏭</div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#f1f5f9", margin: 0 }}>ApparelFlow ERP</h1>
          <p style={{ color: "#64748b", marginTop: "6px", fontSize: "14px" }}>Cutting Operations & Gatekeeper Terminal</p>
        </div>

        {/* Demo Credentials Panel */}
        <div style={{ background: "#111827", border: "1px solid #1f2d45", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
          <p style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "600", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px", margin: "0 0 12px 0" }}>
            🎯 Demo Credentials — Click to Login
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {DEMO_CREDENTIALS.map((cred) => (
              <button
                key={cred.role}
                id={`demo-${cred.role.toLowerCase().replace(/ /g, "-")}`}
                onClick={(e) => {
                  setEmail(cred.email);
                  setPassword(cred.password);
                  handleLogin(e, cred);
                }}
                style={{
                  background: "#1a2235",
                  border: `1px solid ${cred.color}33`,
                  borderRadius: "8px",
                  padding: "12px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  transition: "all 0.2s",
                  textAlign: "left",
                  width: "100%",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1f2d45")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#1a2235")}
              >
                <span style={{ fontSize: "20px" }}>{cred.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: cred.color, fontWeight: "600", fontSize: "14px" }}>{cred.role}</div>
                  <div style={{ color: "#64748b", fontSize: "12px" }}>{cred.email}</div>
                </div>
                <div style={{ color: "#475569", fontSize: "11px" }}>{cred.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Manual Login Form */}
        <div style={{ background: "#111827", border: "1px solid #1f2d45", borderRadius: "12px", padding: "24px" }}>
          <h2 style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: "700", margin: "0 0 20px 0" }}>Sign In</h2>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", color: "#94a3b8", fontSize: "13px", marginBottom: "6px", fontWeight: "500" }}>
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>
            <div>
              <label style={{ display: "block", color: "#94a3b8", fontSize: "13px", marginBottom: "6px", fontWeight: "500" }}>
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{ background: "#2d0a0a", border: "1px solid #ef4444", borderRadius: "8px", padding: "10px 14px", color: "#ef4444", fontSize: "14px" }}>
                ⚠️ {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              style={{
                background: loading ? "#1e3a8a" : "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.2s",
                marginTop: "4px",
              }}
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: "#334155", fontSize: "12px", marginTop: "20px" }}>
          Webtezza (Pvt) Ltd · ApparelFlow ERP v1.0
        </p>
      </div>
    </div>
  );
}
