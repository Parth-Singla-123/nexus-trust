"use client";

type ApiRecord = {
  transaction_id: string; device_risk: number; location_risk: number;
  edge_fraud_probability: number; status: string; reason?: string;
};

type DecisionAuditProps = { rows: ApiRecord[]; modelMode: "tfjs_model" | "heuristic_fallback"; backendStatus: string; };

function toPct(value: number): string { return `${Math.round(value * 100)}%`; }

export default function DecisionAudit({ rows, modelMode, backendStatus }: DecisionAuditProps) {
  // Sort by highest risk first to surface threats
  const sorted = [...rows].sort((a, b) => b.edge_fraud_probability - a.edge_fraud_probability).slice(0, 3);

  return (
    <article className="module-card">
      <header className="module-header">
        <h2 className="module-title">Fraud Decision Audit</h2>
        <span className="status-badge status-flag" style={{ background: "transparent", border: "1px solid var(--glass-border)" }}>
          {modelMode === "tfjs_model" ? "Edge Neural Net" : "Heuristic Rule"}
        </span>
      </header>

      <div className="module-body">
        {sorted.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", textAlign: "center", padding: "1rem" }}>Fraud telemetry will appear once transactions are submitted.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {sorted.map((item) => (
              <article key={item.transaction_id} style={{
                background: "rgba(0,0,0,0.2)", border: "1px solid var(--glass-border)", padding: "1rem", borderRadius: "10px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span className={`status-badge ${item.status === "blocked" ? "status-block" : item.edge_fraud_probability >= 0.65 ? "status-flag" : "status-safe"}`}>
                    {item.status}
                  </span>
                  <strong style={{ fontSize: "1.1rem", color: item.edge_fraud_probability > 0.8 ? "var(--red)" : "var(--gold)" }}>
                    {toPct(item.edge_fraud_probability)} Risk
                  </strong>
                </div>
                
                <p style={{ fontSize: "0.85rem", color: "var(--white)", marginBottom: "0.8rem" }}>{item.reason ?? "Transaction Scored"}</p>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", borderTop: "1px solid var(--glass-border)", paddingTop: "0.8rem" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.65rem", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.05em" }}>Device Trust</span>
                    <strong style={{ fontSize: "0.8rem", color: "var(--white)" }}>{toPct(item.device_risk)} Suspect</strong>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.65rem", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.05em" }}>Location Risk</span>
                    <strong style={{ fontSize: "0.8rem", color: "var(--white)" }}>{toPct(item.location_risk)} Suspect</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}