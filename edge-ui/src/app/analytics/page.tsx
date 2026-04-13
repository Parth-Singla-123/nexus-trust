"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";
import { fetchSession } from "@/lib/client-session";

// This will be read from your .env file
const POWERBI_EMBED_URL = process.env.NEXT_PUBLIC_POWERBI_EMBED_URL;

export default function AnalyticsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetchSession().then((session) => {
      if (!session.authenticated) {
        router.replace("/login");
      } else {
        setIsAuthenticated(true);
      }
    });
  }, [router]);

  if (!isAuthenticated) {
    return (
      <main className="bank-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--gold)', fontSize: '1.2rem', animation: 'pulse-dot 1.5s infinite' }}>
          Verifying secure session...
        </div>
      </main>
    );
  }

  return (
    <main className="bank-shell" style={{ maxWidth: '1600px' }}>
      <AppNav />

      <section style={{ marginBottom: "2.5rem" }}>
        <div>
          <p className="hero-tag">Nexus Guardian Intelligence</p>
          <h1 className="section-title">Risk Command Center.</h1>
          <p className="section-sub">
            Live analytics powered by R and PySpark. This dashboard visualizes fraud hotspots, user risk clusters, and operational telemetry from the cloud data pipeline.
          </p>
        </div>
      </section>

      <section style={{ 
        border: "1px solid var(--glass-border)", 
        borderRadius: "var(--radius)", 
        overflow: 'hidden', 
        background: '#1a1a1a', // A dark background for the iframe
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        minHeight: '800px' // Ensure it has height while loading
      }}>
        {POWERBI_EMBED_URL ? (
          <iframe
            title="Nexus Trust Risk Command Center"
            width="100%"
            height="800"
            src={POWERBI_EMBED_URL}
            frameBorder="0"
            allowFullScreen={true}
          ></iframe>
        ) : (
          <div style={{ padding: "4rem", textAlign: "center", color: "var(--muted)" }}>
            <h2>Power BI Dashboard Not Configured</h2>
            <p>Please set the NEXT_PUBLIC_POWERBI_EMBED_URL environment variable.</p>
          </div>
        )}
      </section>
    </main>
  );
}