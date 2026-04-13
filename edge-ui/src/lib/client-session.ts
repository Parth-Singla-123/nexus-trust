export type SessionUser = {
  id: string;
  name: string;
  email: string;
  profile: {
    accountBalance: number;
    monthlyIncome: number;
    riskAppetite: "conservative" | "balanced" | "aggressive";
  };
};

export type SessionResponse = {
  authenticated: boolean;
  user?: SessionUser;
  stats?: {
    approvedCount: number;
    blockedCount: number;
  };
};

export async function fetchSession(): Promise<SessionResponse> {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  if (!response.ok) {
    return { authenticated: false };
  }

  return (await response.json()) as SessionResponse;
}
