"use client";

type ApiRecord = {
  transaction_id: string; amount: number; event_time: string; hour: number;
  status: string; reason?: string;
};

type LiveTransactionsProps = { rows: ApiRecord[]; loading: boolean; };

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown time";
  return parsed.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function LiveTransactions({ rows, loading }: LiveTransactionsProps) {
  return (
    <article className="module-card">
      <header className="module-header">
        <h2 className="module-title">Live Transaction Feed</h2>
        <span className="status-badge status-safe">{loading ? "Syncing..." : "Real-time"}</span>
      </header>

      <div className="module-body" style={{ gap: "0" }}>
        {rows.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", textAlign: "center", padding: "1rem" }}>No transactions available yet.</p>
        ) : (
          rows.slice(0, 7).map((tx) => (
            <div key={tx.transaction_id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 0",
              borderBottom: "1px solid var(--glass-border)", transition: "background var(--transition)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center",
                  background: tx.status === "approved" ? "rgba(34,199,122,0.1)" : "rgba(232,64,64,0.1)",
                  color: tx.status === "approved" ? "var(--green)" : "var(--red)"
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: "18px", height: "18px" }}>
                    {tx.status === "blocked" ? (
                      <><circle cx="12" cy="12" r="9" /><line x1="8" y1="8" x2="16" y2="16" /></>
                    ) : (
                      <polyline points="6 12 10 16 18 8" />
                    )}
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: "0.9rem", color: "var(--white)", fontWeight: 500 }}>{tx.reason ?? "Payment authorization"}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{formatTimestamp(tx.event_time)}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.95rem", fontWeight: 600, color: tx.status === "approved" ? "var(--white)" : "var(--muted)", textDecoration: tx.status === "blocked" ? "line-through" : "none" }}>
                  ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <span className={`status-badge ${tx.status === "approved" ? "status-safe" : "status-block"}`} style={{ marginTop: "0.3rem", fontSize: "0.65rem" }}>
                  {tx.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}