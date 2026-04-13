import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const [approvedCount, blockedCount] = await Promise.all([
    prisma.transaction.count({ where: { userId: user.id, status: "approved" } }),
    prisma.transaction.count({ where: { userId: user.id, status: "blocked" } }),
  ]);

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      profile: {
        accountBalance: Number(user.profile?.accountBalance ?? 0),
        monthlyIncome: Number(user.profile?.monthlyIncome ?? 0),
        riskAppetite: user.profile?.riskAppetite ?? "balanced",
      },
    },
    stats: {
      approvedCount,
      blockedCount,
    },
  });
}
