"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(body?.message ?? "Unable to login. Verify credentials.");
      setBusy(false);
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <main className="hero-section">
      {/* Reusing your beautiful Orbs */}
      <div className="orb-container" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-3" />
      </div>

      <div className="hero-grid" style={{ alignItems: "center" }}>
        
        {/* Left Side: Visuals */}
        <aside>
          <div className="hero-tag">Secure Access Layer</div>
          <h1 className="hero-headline">Welcome back to <em>Nexus Trust.</em></h1>
          <p className="hero-sub">
            Authenticate to continue into your fraud-protected banking workspace with live transfer monitoring and transaction intelligence.
          </p>
          
          <div className="trust-bar" style={{ background: "transparent", border: "none", padding: 0, justifyContent: "flex-start", marginTop: "2rem" }}>
             <div className="trust-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span>Zero-Trust Architecture</span></div>
          </div>
        </aside>

        {/* Right Side: Form Card */}
        <section style={{ display: "flex", justifyContent: "flex-end" }}>
          <div className="feature-card" style={{ width: "100%", maxWidth: "440px", borderRadius: "var(--radius-lg)", border: "1px solid var(--glass-border)", background: "var(--glass)", backdropFilter: "blur(20px)" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--white)", marginBottom: "0.5rem" }}>Sign In</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "2rem" }}>Access your enterprise-grade session.</p>

            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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
                  placeholder="••••••••"
                  required
                  style={{ width: "100%", padding: "0.8rem 1rem", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: "8px", color: "white", outline: "none", transition: "border 0.3s" }}
                  onFocus={(e) => e.target.style.borderColor = "var(--gold)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--border)"}
                />
              </label>

              {error && <p style={{ color: "var(--red)", fontSize: "0.85rem", background: "rgba(232,64,64,0.1)", padding: "0.5rem", borderRadius: "6px", border: "1px solid rgba(232,64,64,0.3)" }}>{error}</p>}

              <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }} disabled={busy}>
                {busy ? "Authenticating..." : "Sign In →"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.85rem", color: "var(--muted)" }}>
              New customer? <Link href="/signup" style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}>Create an account</Link>
            </p>
          </div>
        </section>

      </div>
    </main>
  );
}