"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Unable to create account.");
      setBusy(false);
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <main className="hero-section">
      <div className="orb-container" aria-hidden="true">
        <div className="orb orb-2" style={{ opacity: 0.15 }} />
        <div className="orb orb-3" />
      </div>

      <div className="hero-grid" style={{ alignItems: "center" }}>
        
        <aside>
          <div className="hero-tag">Secure Onboarding</div>
          <h1 className="hero-headline">Start banking with <em>confidence.</em></h1>
          <p className="hero-sub">
            Create your account to access secure transfers, transparent edge-scored fraud decisions, and real-time operational visibility from day one.
          </p>

          <div className="insight-grid" style={{ gridTemplateColumns: "1fr", gap: "1rem", marginTop: "2rem" }}>
            <div className="insight-item" style={{ paddingTop: "1rem", borderTop: "1px solid var(--glass-border)" }}>
              <strong style={{ color: "var(--gold)" }}>Zero-Latency Processing</strong>
              <p>On-device TF.js models ensure seamless user experience.</p>
            </div>
          </div>
        </aside>

        <section style={{ display: "flex", justifyContent: "flex-end" }}>
          <div className="feature-card" style={{ width: "100%", maxWidth: "440px", borderRadius: "var(--radius-lg)", border: "1px solid var(--glass-border)", background: "var(--glass)", backdropFilter: "blur(20px)" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--white)", marginBottom: "0.5rem" }}>Open Account</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "2rem" }}>Set up your secure Nexus Trust profile.</p>

            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <label style={{ display: "block" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.5rem", display: "block" }}>Full Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  style={{ width: "100%", padding: "0.8rem 1rem", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: "8px", color: "white", outline: "none", transition: "border 0.3s" }}
                  onFocus={(e) => e.target.style.borderColor = "var(--gold)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                />
              </label>

              <label style={{ display: "block" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.5rem", display: "block" }}>Email Address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  style={{ width: "100%", padding: "0.8rem 1rem", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: "8px", color: "white", outline: "none", transition: "border 0.3s" }}
                  onFocus={(e) => e.target.style.borderColor = "var(--gold)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                />
              </label>

              <label style={{ display: "block" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.5rem", display: "block" }}>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8+ chars with symbols"
                  required
                  style={{ width: "100%", padding: "0.8rem 1rem", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: "8px", color: "white", outline: "none", transition: "border 0.3s" }}
                  onFocus={(e) => e.target.style.borderColor = "var(--gold)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                />
              </label>

              {error && <p style={{ color: "var(--red)", fontSize: "0.85rem", background: "rgba(232,64,64,0.1)", padding: "0.5rem", borderRadius: "6px", border: "1px solid rgba(232,64,64,0.3)" }}>{error}</p>}

              <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }} disabled={busy}>
                {busy ? "Creating Profile..." : "Create Secure Account →"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.85rem", color: "var(--muted)" }}>
              Already registered? <Link href="/login" style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}>Sign in here</Link>
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}