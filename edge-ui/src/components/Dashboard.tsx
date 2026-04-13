"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { SessionUser } from "@/lib/client-session";

type DashboardProps = {
  user: SessionUser;
  approvedCount: number;
  blockedCount: number;
  backendStatus: "connected" | "degraded";
  modelMode: "tfjs_model" | "heuristic_fallback";
  children: ReactNode;
};

export default function Dashboard({ user, approvedCount, blockedCount, backendStatus, modelMode, children }: DashboardProps) {
  const total = approvedCount + blockedCount;
  const blockRate = total > 0 ? Math.round((blockedCount / total) * 100) : 0;

  return (
    <section className="dash-grid">
      <aside style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        
        {/* Premium Balance Card */}
        <div style={{ 
          background: "linear-gradient(135deg, #0f2a52 0%, #1a3a6b 50%, #0f2a52 100%)", 
          borderRadius: "var(--radius)", padding: "1.75rem", border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)", position: "relative", overflow: "hidden"
        }}>
          <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "100px", height: "100px", background: "radial-gradient(circle, var(--gold) 0%, transparent 70%)", opacity: 0.1, borderRadius: "50%" }} />
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.6)", marginBottom: "0.5rem" }}>
            Total Available Balance
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "2.2rem", fontWeight: 600, color: "var(--white)", marginBottom: "1.5rem" }}>
            ${user.profile.accountBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Primary Settlement</div>
            <div style={{ fontSize: "0.85rem", letterSpacing: "0.15em", color: "rgba(255,255,255,0.5)" }}>•••• 1984</div>
          </div>
        </div>

        <article className="module-card">
          <header className="module-header">
            <h2 className="module-title">Operations Snapshot</h2>
          </header>
          <div className="module-body" style={{ gap: "0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.8rem 0", borderBottom: "1px solid var(--glass-border)" }}>
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Approved Transactions</span>
              <strong style={{ color: "var(--green)" }}>{approvedCount}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.8rem 0", borderBottom: "1px solid var(--glass-border)" }}>
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Blocked Anomalies</span>
              <strong style={{ color: "var(--red)" }}>{blockedCount}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.8rem 0" }}>
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>Edge Block Rate</span>
              <strong style={{ color: "var(--gold)" }}>{blockRate}%</strong>
            </div>
          </div>
        </article>

        <article className="module-card">
          <header className="module-header">
            <h2 className="module-title">Security Runtime</h2>
          </header>
          <div className="module-body" style={{ gap: "0.8rem", fontSize: "0.85rem", color: "var(--muted)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Edge Inference</span>
              <strong style={{ color: "var(--white)" }}>{modelMode === "tfjs_model" ? "TF.js Active" : "Fallback"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Cloud Connector</span>
              <strong style={{ color: "var(--white)" }}>{backendStatus === "connected" ? "Healthy" : "Delayed"}</strong>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
              <span className={`status-badge ${backendStatus === "connected" ? "status-safe" : "status-flag"}`}>
                {backendStatus === "connected" ? "Online" : "Degraded"}
              </span>
              <span className="status-badge status-safe">Guardian Active</span>
            </div>
          </div>
        </article>

        <article className="module-card">
          <header className="module-header">
            <h2 className="module-title">Quick Actions</h2>
          </header>
          <div className="module-body" style={{ gap: "0.8rem" }}>
            <Link href="/transactions" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
              Open Transaction Ledger
            </Link>
            <Link href="/profile" className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }}>
              Update Financial Profile
            </Link>
          </div>
        </article>
      </aside>

      <section className="dash-main">{children}</section>
    </section>
  );
}