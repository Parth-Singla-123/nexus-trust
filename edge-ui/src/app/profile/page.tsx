"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";
import { fetchSession } from "@/lib/client-session";

export default function ProfilePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accountBalance, setAccountBalance] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [riskAppetite, setRiskAppetite] = useState<"conservative" | "balanced" | "aggressive">("balanced");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let mounted = true;

    fetchSession()
      .then((session) => {
        if (!mounted) {
          return;
        }

        if (!session.authenticated || !session.user) {
          router.replace("/login");
          return;
        }

        setName(session.user.name);
        setEmail(session.user.email);
        setAccountBalance(session.user.profile.accountBalance);
        setMonthlyIncome(session.user.profile.monthlyIncome);
        setRiskAppetite(session.user.profile.riskAppetite);
      })
      .catch(() => {
        if (mounted) {
          router.replace("/login");
        }
      });

    return () => {
      mounted = false;
    };
  }, [router]);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        accountBalance,
        monthlyIncome,
        riskAppetite,
      }),
    });

    const body = (await response.json().catch(() => null)) as { message?: string } | null;

    if (!response.ok) {
      setNotice({ type: "error", text: body?.message ?? "Unable to save profile." });
      setBusy(false);
      return;
    }

    setNotice({ type: "ok", text: body?.message ?? "Profile updated successfully." });
    setBusy(false);
  }

  return (
    <main className="bank-shell">
      <AppNav />

      <section style={{ marginBottom: "3rem" }}>
        <div className="hero-tag">Customer Profile Controls</div>
        <h1 className="section-title">Manage your financial context.</h1>
        <p className="section-sub">
          These values influence transfer limits, risk interpretation, and personalized account operations.
        </p>
      </section>

      {/* We use the dash-grid but invert it (main content left, sidebar right) */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: "2rem" }}>
        
        {/* Main Form */}
        <article className="module-card">
          <header className="module-header">
            <h2 className="module-title">Profile Settings</h2>
          </header>

          <form className="module-body" onSubmit={saveProfile}>
            <div className="split-input-row">
              <label className="input-block">
                <span className="input-label">Full Name</span>
                <input 
                  type="text" 
                  className="input-field" 
                  value={name} 
                  onChange={(event) => setName(event.target.value)} 
                  required 
                />
              </label>

              <label className="input-block">
                <span className="input-label">Email (Read Only)</span>
                <input 
                  type="email" 
                  className="input-field" 
                  value={email} 
                  style={{ opacity: 0.6, cursor: "not-allowed" }}
                  readOnly 
                  disabled 
                />
              </label>
            </div>

            <div className="split-input-row">
              <label className="input-block">
                <span className="input-label">Account Balance ($)</span>
                <input
                  type="number"
                  className="input-field"
                  min={0}
                  value={accountBalance}
                  onChange={(event) => setAccountBalance(Number(event.target.value))}
                  required
                />
              </label>

              <label className="input-block">
                <span className="input-label">Monthly Income ($)</span>
                <input
                  type="number"
                  className="input-field"
                  min={0}
                  value={monthlyIncome}
                  onChange={(event) => setMonthlyIncome(Number(event.target.value))}
                  required
                />
              </label>
            </div>

            <label className="input-block">
              <span className="input-label">Risk Appetite Configuration</span>
              <select 
                className="input-field" 
                value={riskAppetite} 
                onChange={(event) => setRiskAppetite(event.target.value as "conservative" | "balanced" | "aggressive")}
              > 
                <option value="conservative">Conservative (Max Security & OTPs)</option>
                <option value="balanced">Balanced (Standard Tuning)</option>
                <option value="aggressive">Aggressive (Fewer Thresholds)</option>
              </select>
            </label>

            {notice && (
              <div style={{ 
                padding: "0.8rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "bold",
                background: notice.type === "error" ? "rgba(232,64,64,0.15)" : "rgba(34,199,122,0.15)",
                color: notice.type === "error" ? "var(--red)" : "var(--green)", 
                border: `1px solid ${notice.type === "error" ? "rgba(232,64,64,0.3)" : "rgba(34,199,122,0.3)"}`
              }}>
                {notice.text}
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "1.5rem", marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "Synchronizing..." : "Save Profile Context →"}
              </button>
            </div>
          </form>
        </article>

        {/* Intelligence Sidebar */}
        <aside className="module-card">
          <header className="module-header">
            <h2 className="module-title">Profile Intelligence</h2>
          </header>
          <div className="module-body" style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.6 }}>
            <p>
              <strong style={{ color: "var(--white)" }}>Balance Context:</strong><br/>
              Approved transfers securely debit this amount in real time. Insufficient funds block transfers locally.
            </p>
            <p>
              <strong style={{ color: "var(--white)" }}>Income Context:</strong><br/>
              Used by our backend Spark cluster to establish behavioral interpretation windows and detect anomalies.
            </p>
            <p>
              <strong style={{ color: "var(--white)" }}>Risk Appetite:</strong><br/>
              Supports tailored analytics and dynamically adjusts the confidence threshold required before triggering Step-Up OTP authentication.
            </p>
            
            {/* Themed SVG Illustration replacing the old blue one */}
            <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
              <svg viewBox="0 0 340 220" style={{ width: "100%", height: "auto" }} aria-hidden="true">
                <path d="M20 170 C72 96, 112 90, 162 124 S248 186, 320 102" fill="none" stroke="#c9973a" strokeWidth="8" strokeLinecap="round" />
                <rect x="58" y="132" width="34" height="48" rx="8" fill="#e6b85c" opacity="0.45" />
                <rect x="122" y="108" width="34" height="72" rx="8" fill="#c9973a" opacity="0.45" />
                <rect x="188" y="88" width="34" height="92" rx="8" fill="#a87730" opacity="0.42" />
                <rect x="254" y="122" width="34" height="58" rx="8" fill="#22c77a" opacity="0.45" />
                {/* Decorative dots */}
                <circle cx="162" cy="124" r="6" fill="#f8f9fb" />
                <circle cx="320" cy="102" r="6" fill="#f8f9fb" />
              </svg>
            </div>
          </div>
        </aside>

      </section>
    </main>
  );
}