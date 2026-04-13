"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginCard() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = (e: any) => {
    e.preventDefault();
    setLoading(true);
    // Simulate auth
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1200);
  };

  return (
    <div className="auth-layout">
      <div className="auth-visual">
         <div style={{ maxWidth: "500px" }}>
            <h1 className="hero-title" style={{ color: "white", fontSize: "3.5rem", marginBottom: "2rem" }}>
              Secure,<br/>Intelligent,<br/>Banking.
            </h1>
            <p className="hero-subtitle" style={{ color: "rgba(255,255,255,0.8)", fontSize: "1.125rem", marginBottom: "3rem" }}>
              Nexus Guardian protects your wealth with real-time intelligent monitoring, giving you peace of mind for every transaction.
            </p>
            
            <div className="trust-badge" style={{ background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: "18px", height: "18px" }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
              Enterprise Grade Security
            </div>
         </div>
      </div>
      <div className="auth-form-container">
         <div style={{ maxWidth: "400px", width: "100%", margin: "0 auto" }}>
           <div className="brand-wrapper" style={{ marginBottom: "2.5rem" }}>
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: "36px", height: "36px", color: "var(--bank-blue)" }}>
               <path d="M12 2L2 7l10 5 10-5-10-5z" />
               <path d="M2 17l10 5 10-5" />
               <path d="M2 12l10 5 10-5" />
             </svg>
             Nexus Trust
           </div>
           
           <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--bank-navy)", marginBottom: "0.5rem" }}>Welcome back</h2>
           <p style={{ color: "var(--bank-text-light)", marginBottom: "2rem" }}>Enter your credentials to securely sign in.</p>

           <form onSubmit={handleLogin}>
             <div className="input-block">
               <label className="input-label">User ID / Email</label>
               <input type="text" className="input-field" placeholder="Enter your ID" defaultValue="alice" required />
             </div>
             
             <div className="input-block">
               <label className="input-label" style={{ display: "flex", justifyContent: "space-between" }}>
                  Password
                  <a href="#" style={{ fontWeight: 500, color: "var(--bank-blue)", fontSize: "0.800rem" }}>Forgot?</a>
               </label>
               <input type="password" className="input-field" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" defaultValue="password" required />
             </div>

             <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "1rem", marginTop: "1rem" }} disabled={loading}>
               {loading ? "Authenticating securely..." : "Sign In"}
             </button>
           </form>

           <div style={{ marginTop: "2.5rem", textAlign: "center", fontSize: "0.875rem", color: "var(--bank-text-light)" }}>
             Don't have an account? <Link href="/login" style={{ fontWeight: 700, color: "var(--bank-blue)" }}>Open an account today.</Link>
           </div>
         </div>
      </div>
    </div>
  );
}
