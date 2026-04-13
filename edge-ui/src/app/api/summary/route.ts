import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const [totalTx, totalBlocked, totalVolume] = await prisma.$transaction([
      prisma.transaction.count({ where: { userId: user.id } }),
      prisma.transaction.count({ where: { userId: user.id, status: "blocked" } }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userId: user.id, status: "approved" },
      }),
    ]);
    
    return NextResponse.json({
      totalTransactions: totalTx,
      totalBlocked: totalBlocked,
      approvedVolume: totalVolume._sum.amount ?? 0,
    });
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch summary." }, { status: 500 });
  }
}