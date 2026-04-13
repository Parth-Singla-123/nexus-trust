"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchSession, SessionUser } from "@/lib/client-session";

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetchSession().then((session) => {
      if (session.authenticated && session.user) setUser(session.user);
    });
  }, [pathname]);

  if (!user) return null;

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/login");
    router.refresh();
  }

  return (
    <nav className="nav-root scrolled">
      <div className="nav-inner" style={{ maxWidth: "1400px" }}>
        <Link href="/dashboard" className="brand">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
          </div>
          Nexus Trust
        </Link>

        <div className="nav-links">
          {["Dashboard", "Transactions", "Analytics", "Profile"].map((item) => ( // <-- ADDED "Analytics" HERE
            <Link 
              key={item} 
              href={`/${item.toLowerCase()}`} 
              className="nav-link" 
              style={pathname === `/${item.toLowerCase()}` ? { color: "var(--gold)", background: "var(--glass)" } : {}}
            >
              {item}
            </Link>
          ))}
        </div>

        <div className="nav-actions">
          <div style={{ textAlign: "right", marginRight: "1rem", display: "none" }} className="hidden md:block">
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--white)" }}>{user.name}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--gold)" }}>{user.email}</div>
          </div>
          <button className="btn btn-ghost" onClick={logout} disabled={loggingOut} style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }}>
            {loggingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </div>
    </nav>
  );
}