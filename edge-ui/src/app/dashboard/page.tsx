"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";
import Dashboard from "@/components/Dashboard";
import TransferForm, { TransferDecision } from "@/components/TransferForm";
import LiveTransactions from "@/components/LiveTransactions";
import DecisionAudit from "@/components/DecisionAudit";
import { getInferenceMode } from "@/lib/tfjs-logic";
import { fetchSession, SessionUser } from "@/lib/client-session";

type ApiRecord = {
  transaction_id: string;
  user_id: string;
  amount: number;
  event_time: string;
  hour: number;
  device_risk: number;
  location_risk: number;
  txn_velocity: number;
  edge_fraud_probability: number;
  status: string;
  reason?: string;
};

const POLL_INTERVAL_MS = 8000;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [approvedCount, setApprovedCount] = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);
  const [records, setRecords] = useState<ApiRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"connected" | "degraded">("connected");
  const [modelMode, setModelMode] = useState<"tfjs_model" | "heuristic_fallback">("heuristic_fallback");
  
  // NEW: Simulation State
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetchSession().then((session) => {
      if (!mounted) return;
      if (!session.authenticated || !session.user) {
        router.replace("/login");
        return;
      }
      setUser(session.user);
      setApprovedCount(session.stats?.approvedCount ?? 0);
      setBlockedCount(session.stats?.blockedCount ?? 0);
    }).catch(() => {
      if (mounted) router.replace("/login");
    });

    getInferenceMode().then((mode) => {
      if (mounted) setModelMode(mode);
    }).catch(() => {
      if (mounted) setModelMode("heuristic_fallback");
    });

    return () => { mounted = false; };
  }, [router]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const pullRecords = async () => {
      setLoadingRecords(true);
      try {
        const response = await fetch("/api/transactions?limit=25", { cache: "no-store" });
        if (!response.ok) throw new Error("backend sync failed");

        const body = (await response.json()) as { records?: ApiRecord[] };
        if (mounted) {
          setRecords(body.records ?? []);
          setBackendStatus("connected");
        }
      } catch {
        if (mounted) setBackendStatus("degraded");
      } finally {
        if (mounted) setLoadingRecords(false);
      }
    };

    pullRecords();
    const timer = setInterval(pullRecords, POLL_INTERVAL_MS);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [user]);

  const velocity24h = useMemo(() => {
    const now = Date.now();
    return records
      .filter((row) => row.status === "approved")
      .filter((row) => now - new Date(row.event_time).getTime() <= 24 * 60 * 60 * 1000)
      .reduce((sum, row) => sum + row.amount, 0);
  }, [records]);

  function handleDecisionSubmitted(decision: TransferDecision) {
    setRecords((prev) => [decision as ApiRecord, ...prev].slice(0, 50));

    if (decision.status === "approved") {
      setApprovedCount((v) => v + 1);
      setUser((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          profile: {
            ...prev.profile,
            accountBalance: Math.max(0, prev.profile.accountBalance - decision.amount),
          },
        };
      });
      return;
    }
    setBlockedCount((v) => v + 1);
  }

  // --- NEW: SIMULATE TRAFFIC FUNCTION ---
  const handleSimulateTraffic = async () => {
    if (!confirm("Inject 25 synthetic transactions? This will trigger Spark anomaly detection.")) return;
    
    setIsSimulating(true);
    try {
      const response = await fetch("/api/transactions/simulate", { method: "POST" });
      if (!response.ok) throw new Error("Simulation failed");
      
      alert("✅ Traffic successfully injected! Check your Docker terminal to watch Spark and R process the data.");
    } catch (error) {
      alert("❌ Failed to inject traffic.");
      console.error(error);
    } finally {
      setIsSimulating(false);
    }
  };

  if (!user) {
    return (
      <main className="bank-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--gold)', fontSize: '1.2rem', animation: 'pulse-dot 1.5s infinite' }}>
          Authenticating secure session...
        </div>
      </main>
    );
  }

  return (
    <main className="bank-shell">
      <AppNav />

      {/* --- NEW: STATUS BAR WITH SIMULATE BUTTON --- */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem",
        background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "var(--radius)", 
        padding: "1rem 1.5rem", marginBottom: "2rem"
      }}>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
             <span className={`tick-dot ${backendStatus === "connected" ? "green" : "red"}`} />
             <span style={{ fontSize: "0.8rem", color: "var(--muted)", textTransform: "uppercase" }}>
               Backend: <strong style={{ color: "var(--white)" }}>{backendStatus}</strong>
             </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
             <span className={`tick-dot ${modelMode === "tfjs_model" ? "gold" : "red"}`} style={{ animation: "pulse-dot 2s infinite" }} />
             <span style={{ fontSize: "0.8rem", color: "var(--muted)", textTransform: "uppercase" }}>
               Edge AI: <strong style={{ color: "var(--white)" }}>{modelMode === "tfjs_model" ? "ACTIVE" : "FALLBACK"}</strong>
             </span>
          </div>
        </div>

        <button 
          onClick={handleSimulateTraffic} 
          disabled={isSimulating} 
          className="btn btn-ghost" 
          style={{ fontSize: "0.8rem", padding: "0.5rem 1rem", border: "1px solid var(--gold)", color: "var(--gold)" }}
        >
          {isSimulating ? "Injecting Data..." : "🧪 Simulate Spark Traffic"}
        </button>
      </div>

      <section style={{ marginBottom: "2.5rem" }}>
        <div>
          <p className="hero-tag">Nexus Guardian Fraud Operations</p>
          <h1 className="section-title">Production-grade digital banking.</h1>
          <p className="section-sub">
            Transfers are scored on-device before cloud persistence. Verified activity streams directly to the Spark Data Lake.
          </p>
        </div>
      </section>

      <Dashboard
        user={user}
        approvedCount={approvedCount}
        blockedCount={blockedCount}
        backendStatus={backendStatus}
        modelMode={modelMode}
      >
        <TransferForm
          accountBalance={user.profile.accountBalance}
          velocity24h={velocity24h}
          onDecisionSubmitted={handleDecisionSubmitted}
        />

        <div className="split-panel">
          <LiveTransactions rows={records} loading={loadingRecords} />
          <DecisionAudit rows={records} modelMode={modelMode} backendStatus={backendStatus} />
        </div>
      </Dashboard>
    </main>
  );
}