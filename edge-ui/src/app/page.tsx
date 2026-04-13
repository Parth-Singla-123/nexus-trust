"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { fetchSession, SessionUser } from "@/lib/client-session";

// ─── Animated Counter ──────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = "" }: { target: string; suffix?: string }) {
  const [displayed, setDisplayed] = useState("0");
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const numeric = parseFloat(target.replace(/[^0-9.]/g, ""));
        const isDecimal = target.includes(".");
        let start = 0;
        const duration = 1600;
        const startTime = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - startTime) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = numeric * eased;
          setDisplayed(isDecimal ? current.toFixed(2) : Math.floor(current).toString());
          if (progress < 1) requestAnimationFrame(tick);
          else setDisplayed(target.replace(/[0-9.]+/, isDecimal ? numeric.toFixed(2) : numeric.toString()));
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <strong ref={ref as React.RefObject<HTMLElement>}>{displayed}{suffix}</strong>;
}

// ─── Floating Orbs Background ─────────────────────────────────────────────────
function FloatingOrbs() {
  return (
    <div className="orb-container" aria-hidden="true">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
    </div>
  );
}

export default function HomePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchSession().then((session) => {
      if (session.authenticated && session.user) setUser(session.user);
    });
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <nav className={`nav-root${scrolled ? " scrolled" : ""}`}>
        <div className="nav-inner">
          <Link href="/" className="brand">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                <line x1="12" y1="12" x2="12" y2="16" />
                <line x1="10" y1="14" x2="14" y2="14" />
              </svg>
            </div>
            Nexus Trust
          </Link>

          <div className="nav-links">
            {["Security", "Products", "Insights", "Experience"].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="nav-link">{item}</a>
            ))}
          </div>

          <div className="nav-actions">
            {user ? (
              <Link href="/dashboard" className="btn btn-primary">Open Dashboard →</Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost">Sign In</Link>
                <Link href="/signup" className="btn btn-primary">Open Account</Link>
              </>
            )}
            <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Trust Bar ─────────────────────────────────────────────────────────── */}
      <div className="trust-bar" style={{ marginTop: "72px" }}>
        {[
          { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, label: "256-bit AES Encryption" },
          { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, label: "24/7 Fraud Monitoring" },
          { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, label: "Multi-Factor Authentication" },
          { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>, label: "FDIC Insured Up to $250K" },
          { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>, label: "Zero-Knowledge Architecture" },
        ].map(({ icon, label }) => (
          <div key={label} className="trust-item">
            {icon}<span>{label}</span>
          </div>
        ))}
      </div>

      <main>
        {/* ── Hero ────────────────────────────────────────────────────────────── */}
        <section className="hero-section">
          <FloatingOrbs />
          <div className="hero-grid">
            <div>
              <div className="hero-tag">Trusted by 180,000+ Customers</div>
              <h1 className="hero-headline">
                Banking built on <em>intelligence,</em><br />secured by design.
              </h1>
              <p className="hero-sub">
                Nexus Trust combines edge-native fraud filtering with cloud-grade historical analysis —
                so every transfer clears faster, and every account stays safer.
              </p>
              <div className="hero-cta-group">
                {user ? (
                  <Link href="/dashboard" className="btn btn-primary btn-lg">Go to Dashboard →</Link>
                ) : (
                  <>
                    <Link href="/signup" className="btn btn-primary btn-lg">Open Your Account →</Link>
                    <Link href="/login" className="btn btn-ghost btn-lg">Sign In</Link>
                  </>
                )}
              </div>
              <div className="hero-kpis">
                <div className="kpi-item"><AnimatedCounter target="99.97" suffix="%" /><span>Platform availability</span></div>
                <div className="kpi-item"><AnimatedCounter target="220" suffix="ms" /><span>Edge scoring latency</span></div>
                <div className="kpi-item"><AnimatedCounter target="180" suffix="K+" /><span>Protected accounts</span></div>
              </div>
            </div>

            <div className="hero-visual-panel">
              <div className="card-stack">
                {/* Back card */}
                <div className="bank-card bank-card-back" />
                {/* Main card */}
                <div className="bank-card bank-card-main">
                  <div className="card-chip" />
                  <div className="card-number">•••• •••• •••• 4821</div>
                  <div className="card-meta">
                    <div>
                      <div className="card-name">Nexus Premier</div>
                      <div className="card-expires">VALID THRU 09/29</div>
                    </div>
                    <div className="card-network">
                      <div className="card-network-dot" />
                      <div className="card-network-dot" />
                    </div>
                  </div>
                </div>

                {/* Activity ticker */}
                <div className="activity-ticker">
                  <div className="tick-item">
                    <span className="tick-dot green" />
                    <div className="tick-label"><strong>Transfer Cleared</strong>₹42,500 · Verified</div>
                  </div>
                  <div className="tick-item">
                    <span className="tick-dot gold" />
                    <div className="tick-label"><strong>Risk Score: 0.04</strong>Low threat · Passed</div>
                  </div>
                  <div className="tick-item">
                    <span className="tick-dot red" />
                    <div className="tick-label"><strong>Anomaly Blocked</strong>3 AM · ₹2.1L flagged</div>
                  </div>
                </div>

                {/* Fraud shield badge */}
                <div className="fraud-badge">
                  <div className="fraud-badge-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <polyline points="9 12 11 14 15 10"/>
                    </svg>
                  </div>
                  <div className="fraud-badge-text">
                    <strong>Fraud Intercepted</strong>
                    <span>Edge filter · &lt;220ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Security Features ────────────────────────────────────────────────── */}
        <section id="security" className="section">
          <div className="section-inner">
            <div className="section-eyebrow">Security Architecture</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "flex-end", marginBottom: "0" }}>
              <h2 className="section-title" style={{ margin: 0 }}>Three layers of protection, <em>always on.</em></h2>
              <p className="section-sub" style={{ marginBottom: 0 }}>Every transaction passes through TinyML edge scoring, cloud-scale behavioral analysis, and human-supervised anomaly detection — in parallel.</p>
            </div>

            <div className="features-grid" style={{ marginTop: "3.5rem" }}>
              {[
                {
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
                  title: "Edge Threat Interception",
                  desc: "A quantized TF.js neural network scores transactions locally on your device in under 220ms — blocking blatant anomalies before a single byte hits the server.",
                },
                {
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
                  title: "Cloud-Scale Historical Analysis",
                  desc: "PySpark ingests continuous transaction streams and calculates rolling 24-hour behavioral windows — surfacing subtle fraud rings that edge scoring alone cannot detect.",
                },
                {
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
                  title: "Transparent Customer Assurance",
                  desc: "Customers see transaction status, protection state, and explainable risk outcomes from one polished dashboard — building trust through radical transparency.",
                },
              ].map(({ icon, title, desc }) => (
                <article key={title} className="feature-card">
                  <div className="feature-icon">{icon}</div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Products ──────────────────────────────────────────────────────────── */}
        <section id="products" className="section" style={{ paddingTop: "60px", background: "linear-gradient(180deg, var(--navy) 0%, var(--navy-2) 100%)" }}>
          <div className="section-inner">
            <div className="products-layout">
              <div>
                <div className="section-eyebrow">Platform Modules</div>
                <h2 className="section-title">Built for modern banking — <em>end to end.</em></h2>
                <p className="section-sub">From onboarding to transfer confirmation, every surface is engineered for trust, clarity, and security-first interaction.</p>
                <div className="divider" style={{ marginTop: "2rem" }} />
                <p style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.7 }}>
                  Containerized via Docker Compose. CI/CD pipelines via GitHub Actions.
                  Every module ships with full audit trails and compliance-ready telemetry.
                </p>
                <div style={{ marginTop: "2rem" }}>
                  <Link href={user ? "/dashboard" : "/signup"} className="btn btn-primary">
                    {user ? "Go to Dashboard →" : "Start Banking →"}
                  </Link>
                </div>
              </div>

              <div className="product-cards">
                {[
                  { num: "01", title: "Premium Accounts", desc: "Real-time balance, profile controls, and secure identity-backed sessions with MFA." },
                  { num: "02", title: "Transfer Engine", desc: "Multi-step flow with edge risk scoring, PIN validation, and step-up challenge checks." },
                  { num: "03", title: "Risk Command Center", desc: "Fraud score telemetry, status flags, and audit snapshots in a single pane of glass." },
                  { num: "04", title: "Transaction Ledger", desc: "Cloud-persisted records with clear reasons, timestamps, and edge confidence scores." },
                ].map(({ num, title, desc }) => (
                  <article key={num} className="product-card">
                    <div className="product-card-num">{num}</div>
                    <h3>{title}</h3>
                    <p>{desc}</p>
                    <div className="product-card-arrow">→</div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Insights Band ─────────────────────────────────────────────────────── */}
        <section id="insights" className="section insights-band">
          <div className="section-inner insights-inner">
            <div>
              <div className="section-eyebrow">Intelligence Layer</div>
              <h2 className="section-title" style={{ fontSize: "clamp(1.8rem,3vw,2.4rem)" }}>Operational intelligence leadership can trust.</h2>
              <p className="section-sub" style={{ fontSize: "0.9rem" }}>R-powered SMOTE resampling and clustering algorithms surface hidden fraud rings from imbalanced data.</p>
            </div>
            <div className="insight-grid">
              {[
                { num: "99.3%", label: "Detection Accuracy", desc: "Adaptive risk posture keeps thresholds calibrated without stopping operations." },
                { num: "0.08", label: "Avg. Risk Score", desc: "Every transaction carries an explainable signal and status for compliance confidence." },
                { num: "3.2ms", label: "Edge Decision Time", desc: "Live feeds surface unusual clusters and transaction spikes in near real-time." },
              ].map(({ num, label, desc }) => (
                <div key={label} className="insight-item">
                  <div className="insight-num">{num}</div>
                  <strong>{label}</strong>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────────────── */}
        <section id="experience" className="cta-section">
          <div className="cta-glow" />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="hero-tag" style={{ display: "inline-flex", marginBottom: "1.75rem" }}>Production-Ready Platform</div>
            <h2>Upgrade to banking customers trust<br />and teams operate with confidence.</h2>
            <p>Launch secure onboarding, professional dashboards, and fraud-aware transfers in one integrated experience.</p>
            <div className="cta-actions">
              <Link href={user ? "/dashboard" : "/signup"} className="btn btn-primary btn-lg">
                {user ? "Open Dashboard →" : "Create Secure Account →"}
              </Link>
              {!user && <Link href="/login" className="btn btn-ghost btn-lg">Sign In</Link>}
            </div>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────────────── */}
        <footer className="footer">
          <div className="footer-inner">
            <div className="footer-top">
              <div className="footer-brand">
                <Link href="/" className="brand" style={{ textDecoration: "none" }}>
                  <div className="brand-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                    </svg>
                  </div>
                  Nexus Trust
                </Link>
                <p>A premium digital banking experience with built-in fraud defense — engineered for the modern era.</p>
              </div>
              <div style={{ display: "flex", gap: "4rem", flexWrap: "wrap" }}>
                {[
                  { heading: "Platform", links: ["Dashboard", "Transfers", "Accounts", "Risk Center"] },
                  { heading: "Security", links: ["Edge Scoring", "Fraud Analytics", "Compliance", "Audit Logs"] },
                  { heading: "Company", links: ["About", "Careers", "Press", "Contact"] },
                ].map(({ heading, links }) => (
                  <div key={heading} className="footer-links-group">
                    <h4>{heading}</h4>
                    <ul>
                      {links.map((l) => <li key={l}><a href="#">{l}</a></li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="footer-bottom">
              <p>© 2025 Nexus Trust Bank. All rights reserved. FDIC Insured.</p>
              <p>Privacy Policy · Terms of Service · Cookie Preferences</p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}