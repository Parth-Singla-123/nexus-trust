import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const profilePatchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  accountBalance: z.number().min(0).max(999999999).optional(),
  monthlyIncome: z.number().min(0).max(999999999).optional(),
  riskAppetite: z.enum(["conservative", "balanced", "aggressive"]).optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
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
  });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const parsed = profilePatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid profile payload." }, { status: 400 });
  }

  const data = parsed.data;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(data.name ? { name: data.name } : {}),
      profile: {
        upsert: {
          create: {
            accountBalance: data.accountBalance ?? 0,
            monthlyIncome: data.monthlyIncome ?? 0,
            riskAppetite: data.riskAppetite ?? "balanced",
          },
          update: {
            ...(typeof data.accountBalance === "number" ? { accountBalance: data.accountBalance } : {}),
            ...(typeof data.monthlyIncome === "number" ? { monthlyIncome: data.monthlyIncome } : {}),
            ...(data.riskAppetite ? { riskAppetite: data.riskAppetite } : {}),
          },
        },
      },
    },
    include: {
      profile: true,
    },
  });

  return NextResponse.json({
    message: "Profile updated.",
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      profile: {
        accountBalance: Number(updated.profile?.accountBalance ?? 0),
        monthlyIncome: Number(updated.profile?.monthlyIncome ?? 0),
        riskAppetite: updated.profile?.riskAppetite ?? "balanced",
      },
    },
  });
}
