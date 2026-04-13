import { randomUUID } from "node:crypto";
import { appendFile, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";

export const runtime = "nodejs";

type TransactionPayload = {
  amount: number;
  event_time: string;
  hour: number;
  device_risk: number;
  location_risk: number;
  txn_velocity: number;
  edge_fraud_probability: number;
  status: "approved" | "blocked";
  reason?: string;
};

type DbTransactionRow = {
  publicId: string;
  userId: string;
  amount: number | { toString(): string };
  eventTime: Date;
  hour: number;
  deviceRisk: number;
  locationRisk: number;
  txnVelocity: number;
  edgeFraudProbability: number;
  status: string;
  reason: string;
};

const transactionSchema = z.object({
  amount: z.number().positive(),
  event_time: z.string().datetime(),
  hour: z.number().int().min(0).max(23),
  device_risk: z.number().min(0).max(1),
  location_risk: z.number().min(0).max(1),
  txn_velocity: z.number().min(0).max(10000),
  edge_fraud_probability: z.number().min(0).max(1),
  status: z.enum(["approved", "blocked"]),
  reason: z.string().max(240).optional(),
});

const CSV_HEADERS = [
  "transaction_id",
  "user_id",
  "amount",
  "event_time",
  "hour",
  "device_risk",
  "location_risk",
  "txn_velocity",
  "edge_fraud_probability",
  "status",
];

function resolveSparkDataDir(): string {
  return process.env.SHARED_DATA_DIR
    ? process.env.SHARED_DATA_DIR
    : path.resolve(process.cwd(), "..", "spark-engine", "data");
}

function resolveAnalyticsOutputDir(): string {
  return process.env.SHARED_DATA_DIR
    ? process.env.SHARED_DATA_DIR
    : path.resolve(process.cwd(), "..", "analytics-r", "output");
}

function toCsvCell(value: string | number): string {
  const raw = String(value);
  if (raw.includes(",") || raw.includes("\n") || raw.includes('"')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

// THE CLOUD FEEDBACK LOOP
function isUserBlacklisted(userId: string): boolean {
  try {
    const dataDir = resolveAnalyticsOutputDir();
    // Check if R has outputted a blacklist file
    const blacklistPath = path.join(dataDir, "blacklist.csv");
    if (fs.existsSync(blacklistPath)) {
      const blacklistData = fs.readFileSync(blacklistPath, 'utf-8');
      if (blacklistData.includes(userId)) return true;
    }
  } catch (error) {
    console.error("Blacklist check failed (safe to proceed):", error);
  }
  return false;
}

function validatePayload(payload: unknown): { ok: true; data: TransactionPayload } | { ok: false; message: string } {
  const parsed = transactionSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Invalid transaction payload." };
  }
  return { ok: true, data: parsed.data };
}

async function ensureCsv(filePath: string): Promise<void> {
  try {
    await stat(filePath);
  } catch {
    await writeFile(filePath, `${CSV_HEADERS.join(",")}\n`, "utf-8");
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const validStatus = statusParam === "approved" || statusParam === "blocked" ? statusParam : null;
  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? 20);
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(Math.trunc(limitParam), 1), 200) : 20;

  const [rows, totalCount] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id, ...(validStatus ? { status: validStatus } : {}) },
      orderBy: { eventTime: "desc" },
      take: limit,
    }),
    prisma.transaction.count({
      where: { userId: user.id, ...(validStatus ? { status: validStatus } : {}) },
    }),
  ]);

  const records = (rows as DbTransactionRow[]).map((row) => ({
    transaction_id: row.publicId,
    user_id: row.userId,
    amount: Number(row.amount),
    event_time: row.eventTime.toISOString(),
    hour: row.hour,
    device_risk: row.deviceRisk,
    location_risk: row.locationRisk,
    txn_velocity: row.txnVelocity,
    edge_fraud_probability: row.edgeFraudProbability,
    status: row.status,
    reason: row.reason,
  }));

  return NextResponse.json({ status: "ok", records, count: totalCount });
}


export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // UNIT II TO UNIT I INTEGRATION: The Blacklist Feedback Loop
  if (isUserBlacklisted(user.id)) {
    return NextResponse.json(
      { message: "Account locked by Cloud Risk Intelligence (R-Cluster Anomaly)." },
      { status: 403 }
    );
  }

  const payload = await req.json();
  const validated = validatePayload(payload);

  if (!validated.ok) {
    return NextResponse.json({ status: "rejected", message: validated.message }, { status: 400 });
  }

  const dataDir = resolveSparkDataDir();
    
  const csvPath = path.join(dataDir, "transactions.csv");

  const transactionId = `txn_${Date.now()}_${randomUUID().slice(0, 8)}`;

  let created;
  try {
    created =
      validated.data.status === "approved"
        ? await prisma.$transaction(async (tx) => {
            const profile = await tx.financialProfile.findUnique({
              where: { userId: user.id },
            });

            if (!profile) throw new Error("PROFILE_NOT_FOUND");
            if (Number(profile.accountBalance) < validated.data.amount) throw new Error("INSUFFICIENT_BALANCE");

            const saved = await tx.transaction.create({
              data: {
                publicId: transactionId,
                userId: user.id,
                amount: validated.data.amount,
                eventTime: new Date(validated.data.event_time),
                hour: validated.data.hour,
                deviceRisk: validated.data.device_risk,
                locationRisk: validated.data.location_risk,
                txnVelocity: validated.data.txn_velocity,
                edgeFraudProbability: validated.data.edge_fraud_probability,
                status: validated.data.status,
                reason: validated.data.reason ?? "standard transaction pattern",
              },
            });

            await tx.financialProfile.update({
              where: { userId: user.id },
              data: { accountBalance: { decrement: validated.data.amount } },
            });

            return saved;
          })
        : await prisma.transaction.create({
            data: {
              publicId: transactionId,
              userId: user.id,
              amount: validated.data.amount,
              eventTime: new Date(validated.data.event_time),
              hour: validated.data.hour,
              deviceRisk: validated.data.device_risk,
              locationRisk: validated.data.location_risk,
              txnVelocity: validated.data.txn_velocity,
              edgeFraudProbability: validated.data.edge_fraud_probability,
              status: validated.data.status,
              reason: validated.data.reason ?? "standard transaction pattern",
            },
          });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
      return NextResponse.json({ status: "rejected", message: "Insufficient account balance." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "PROFILE_NOT_FOUND") {
      return NextResponse.json({ status: "rejected", message: "Financial profile not found." }, { status: 400 });
    }
    return NextResponse.json({ status: "rejected", message: "Transaction processing failed." }, { status: 500 });
  }

  let forwardingStatus: "forwarded" | "failed" = "forwarded";
  try {
    await mkdir(dataDir, { recursive: true });
    await ensureCsv(csvPath);

    const row = [
      transactionId, user.id, validated.data.amount, validated.data.event_time,
      validated.data.hour, validated.data.device_risk, validated.data.location_risk,
      validated.data.txn_velocity, validated.data.edge_fraud_probability, validated.data.status,
    ].map(toCsvCell).join(",");

    await appendFile(csvPath, `${row}\n`, "utf-8");
  } catch {
    forwardingStatus = "failed";
  }

  return NextResponse.json({
    status: "accepted",
    transaction_id: created.publicId,
    message: "Transaction forwarded to cloud processor",
    forwarding_status: forwardingStatus,
  });
}