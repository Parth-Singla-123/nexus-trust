import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, SESSION_COOKIE, sessionCookieConfig } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const signupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(190),
  password: z
    .string()
    .min(8)
    .max(72)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
      message: "Password must include upper, lower, number, and special character.",
    }),
});

export async function POST(req: Request) {
  const parsed = signupSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message;
    return NextResponse.json({ message: issue ?? "Invalid signup payload." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return NextResponse.json({ message: "Email is already registered." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      profile: {
        create: {
          accountBalance: 900000,
          monthlyIncome: 150000,
          riskAppetite: "balanced",
        },
      },
    },
    include: {
      profile: true,
    },
  });

  const token = await createSessionToken({
    sub: user.id,
    email: user.email,
    name: user.name,
  });

  const response = NextResponse.json({
    message: "Signup successful.",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });

  response.cookies.set(SESSION_COOKIE, token, sessionCookieConfig);
  return response;
}
