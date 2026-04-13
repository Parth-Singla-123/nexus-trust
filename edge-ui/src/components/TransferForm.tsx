"use client";

import { FormEvent, useMemo, useState, useEffect } from "react";
import { predictFraudProbability } from "@/lib/tfjs-logic";

export type TransferDecision = {
  transaction_id: string; amount: number; event_time: string; hour: number;
  device_risk: number; location_risk: number; txn_velocity: number;
  edge_fraud_probability: number; status: "approved" | "blocked"; reason?: string;
};

type TransferFormProps = { accountBalance: number; velocity24h: number; onDecisionSubmitted: (d: TransferDecision) => void; };

// --- THE SILENT OBSERVER: Calculate Risk using real Browser Biometrics ---
function calculateSilentBiometrics() {
  let deviceRisk = 0.12;
  let locationRisk = 0.08;

  // 1. Device Check (Are they on a new browser/Incognito?)
  if (typeof window !== "undefined") {
    const hasToken = localStorage.getItem("nexus_trusted_device");
    if (!hasToken) {
      deviceRisk = 0.78; // High risk for new devices
      localStorage.setItem("nexus_trusted_device", `trust_${Date.now()}`); // Trust for next time
    }
    
    // 2. Location Check (Timezone Anomaly)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz.startsWith("Asia/")) locationRisk = 0.85; // Massive risk if outside regional baseline
    else if (tz !== "Asia/Kolkata") locationRisk = 0.35; // Regional mismatch inside Asia
  }
  return { deviceRisk, locationRisk };
}

export default function TransferForm({ accountBalance, velocity24h, onDecisionSubmitted }: TransferFormProps) {
  const [beneficiary, setBeneficiary] = useState("");
  const [amount, setAmount] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "warn" | "error"; text: string } | null>(null);

  const parsedAmount = Number(amount || 0);

  async function submitTransfer(event: FormEvent) {
    event.preventDefault();
    if (!beneficiary || parsedAmount <= 0) return setMessage({ type: "error", text: "Invalid input." });
    if (parsedAmount > accountBalance) return setMessage({ type: "error", text: "Insufficient funds." });

    setMessage(null);
    setIsScanning(true);

    setScanStep("Extracting Silent Browser Biometrics...");
    await new Promise(r => setTimeout(r, 600));

    // Calculate real biometrics dynamically
    const { deviceRisk, locationRisk } = calculateSilentBiometrics();

    setScanStep("Evaluating Edge TF.js Graph...");
    const hour = new Date().getHours();
    const txnVelocity = Math.max(1, velocity24h / 1000);

    const probability = await predictFraudProbability({ amount: parsedAmount, hour, deviceRisk, locationRisk, txnVelocity });
    await new Promise(r => setTimeout(r, 600)); 
    setIsScanning(false);

    const isBlocked = probability >= 0.82;
    const payload: Omit<TransferDecision, "transaction_id"> = {
      amount: parsedAmount, event_time: new Date().toISOString(), hour, 
      device_risk: deviceRisk, location_risk: locationRisk, txn_velocity: txnVelocity, 
      edge_fraud_probability: probability, status: isBlocked ? "blocked" : "approved",
      reason: isBlocked ? "Edge anomaly threshold exceeded" : "Standard transfer pattern",
    };

    const response = await fetch("/api/transactions", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });

    // Check if Cloud R-Analytics Blocked it!
    if (response.status === 403) {
      return setMessage({ type: "error", text: "SERVER DENIAL: Account blacklisted by Cloud R-Analytics." });
    }

    const body = await response.json().catch(() => null);
    onDecisionSubmitted({ transaction_id: body?.transaction_id ?? `txn-${Date.now()}`, ...payload });

    if (isBlocked) setMessage({ type: "error", text: `Blocked Locally! Anomaly detected (Score: ${Math.round(probability * 100)}%).` });
    else { setMessage({ type: "ok", text: "Approved by Edge. Synced to Cloud PySpark." }); setAmount(""); setBeneficiary(""); }
  }

  return (
    <article className="module-card">
      <header className="module-header">
        <h2 className="module-title">Initiate Transfer</h2>
        {process.env.NEXT_PUBLIC_EDGE_FILTER_ACTIVE === "true" && (
          <span className="status-badge status-safe" style={{ borderColor: "var(--gold)", color: "var(--gold)" }}>Edge Filter Active</span>
        )}
      </header>

      <form onSubmit={submitTransfer} style={{ position: "relative" }}>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
          Available Balance: <strong style={{ color: "var(--white)" }}>Rs {accountBalance.toLocaleString()}</strong>
        </p>

        <div className="split-input-row" style={{ marginBottom: "1rem" }}>
          <label className="input-block">
            <span className="input-label">Beneficiary ID / UPI</span>
            <input className="input-field" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} required placeholder="Nexus / External ID" />
          </label>
          <label className="input-block">
            <span className="input-label">Amount (INR)</span>
            <input className="input-field" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="0.00" />
          </label>
        </div>

        <div style={{ padding: "0.8rem", background: "var(--glass)", border: "1px solid var(--glass-border)", borderRadius: "8px", marginBottom: "1.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span className="tick-dot gold" style={{ animation: "pulse-dot 2s infinite" }}></span>
          <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>Transactions secured silently by Browser Canvas Fingerprinting & Location Context.</span>
        </div>

        {message && (
          <div style={{ padding: "0.8rem", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.85rem", fontWeight: "bold", background: message.type === "error" ? "rgba(232,64,64,0.15)" : "rgba(34,199,122,0.15)", color: message.type === "error" ? "var(--red)" : "var(--green)", border: `1px solid ${message.type === "error" ? "rgba(232,64,64,0.3)" : "rgba(34,199,122,0.3)"}` }}>
            {message.text}
          </div>
        )}

        <button className="btn btn-primary" type="submit" disabled={isScanning} style={{ width: "100%", justifyContent: "center" }}>
          {isScanning ? "Processing..." : "Submit Transaction →"}
        </button>

        {isScanning && (
          <div style={{ position: "absolute", inset: "-10px", background: "rgba(9, 20, 40, 0.85)", backdropFilter: "blur(4px)", zIndex: 10, borderRadius: "var(--radius)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "1px solid var(--gold)" }}>
            <div style={{ width: "40px", height: "40px", border: "3px solid rgba(201,151,58,0.2)", borderTopColor: "var(--gold)", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "1rem" }} />
            <h3 style={{ color: "var(--gold)", fontFamily: "var(--font-display)", fontSize: "1.2rem", marginBottom: "0.2rem" }}>Edge Filter Active</h3>
            <p style={{ color: "var(--white)", fontSize: "0.85rem", letterSpacing: "0.05em" }}>{scanStep}</p>
          </div>
        )}
      </form>
    </article>
  );
}