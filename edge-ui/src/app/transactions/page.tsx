"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";
import { fetchSession, SessionUser } from "@/lib/client-session";

type ApiRecord = {
  transaction_id: string; amount: number; event_time: string; 
  edge_fraud_probability: number; status: string; reason?: string;
};

export default function TransactionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [rows, setRows] = useState<ApiRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "blocked">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSession().then((session) => {
      if (!session.authenticated || !session.user) router.replace("/login");
      else setUser(session.user);
    });
  }, [router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const query = statusFilter === "all" ? "" : `&status=${statusFilter}`;
    fetch(`/api/transactions?limit=120${query}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((body) => setRows(body.records ?? []))
      .finally(() => setLoading(false));
  }, [statusFilter, user]);

  const summary = useMemo(() => {
    const approved = rows.filter((r) => r.status === "approved");
    const blocked = rows.filter((r) => r.status === "blocked");
    return {
      approvedCount: approved.length,
      blockedCount: blocked.length,
      approvedAmount: approved.reduce((s, r) => s + r.amount, 0),
    };
  }, [rows]);

  if (!user) return null;

  return (
    <main className="bank-shell">
      <AppNav />

      <section style={{ marginBottom: "3rem" }}>
        <div className="hero-tag">Transaction Intelligence Ledger</div>
        <h1 className="section-title">Monitor every decision and anomaly.</h1>
        <p className="section-sub">Inspect approval patterns, blocked attempts, and edge-scoring confidence.</p>
      </section>

      <div className="insight-grid" style={{ marginBottom: "2rem" }}>
        <div className="insight-item" style={{ borderTop: "1px solid var(--border)", background: "var(--glass)", padding: "1.5rem", borderRadius: "12px" }}>
          <div className="insight-num" style={{ color: "var(--green)" }}>{summary.approvedCount}</div>
          <strong>Approved Count</strong>
        </div>
        <div className="insight-item" style={{ borderTop: "1px solid var(--border)", background: "var(--glass)", padding: "1.5rem", borderRadius: "12px" }}>
          <div className="insight-num" style={{ color: "var(--red)" }}>{summary.blockedCount}</div>
          <strong>Blocked Count</strong>
        </div>
        <div className="insight-item" style={{ borderTop: "1px solid var(--border)", background: "var(--glass)", padding: "1.5rem", borderRadius: "12px" }}>
          <div className="insight-num">${summary.approvedAmount.toLocaleString()}</div>
          <strong>Approved Volume</strong>
        </div>
      </div>

      <article className="module-card">
        <header className="module-header">
          <h2 className="module-title">Ledger View</h2>
          <select 
            className="input-field" 
            style={{ width: "200px" }}
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Transactions</option>
            <option value="approved">Approved Only</option>
            <option value="blocked">Blocked Only</option>
          </select>
        </header>

        <div style={{ overflowX: "auto" }}>
          {loading ? (
            <p style={{ color: "var(--muted)", padding: "2rem", textAlign: "center" }}>Fetching ledger data...</p>
          ) : rows.length === 0 ? (
            <p style={{ color: "var(--muted)", padding: "2rem", textAlign: "center" }}>No transactions found.</p>
          ) : (
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Risk Score</th>
                  <th>Audit Trail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.transaction_id}>
                    <td style={{ color: "var(--muted)" }}>{new Date(row.event_time).toLocaleString()}</td>
                    <td style={{ fontWeight: 600 }}>${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>
                      <span className={`status-badge ${row.status === "approved" ? "status-safe" : "status-block"}`}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: row.edge_fraud_probability > 0.8 ? "var(--red)" : "var(--green)" }}>
                        {Math.round(row.edge_fraud_probability * 100)}%
                      </span>
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </article>
    </main>
  );
}