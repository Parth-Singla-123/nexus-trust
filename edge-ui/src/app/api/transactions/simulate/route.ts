import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { appendFile, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const CSV_HEADERS = [
  "transaction_id", "user_id", "amount", "event_time", "hour",
  "device_risk", "location_risk", "txn_velocity", "edge_fraud_probability", "status"
];

// --- DEMO USER PROFILES FOR A RICH LEADERBOARD ---
// We create traffic across a small Indian demo cohort so the simulator uses real user IDs.
const DEMO_USERS = [
  { email: "aarav.demo@fraudops.in", name: "Aarav Sharma", baseRisk: 0.05, accountBalance: 250000, monthlyIncome: 85000, riskAppetite: "balanced" },
  { email: "meera.demo@fraudops.in", name: "Meera Iyer", baseRisk: 0.6, accountBalance: 400000, monthlyIncome: 120000, riskAppetite: "conservative" },
  { email: "kabir.demo@fraudops.in", name: "Kabir Khan", baseRisk: 0.1, accountBalance: 180000, monthlyIncome: 65000, riskAppetite: "balanced" },
];

async function upsertDemoUser(userSeed: {
  email: string;
  name: string;
  accountBalance: number;
  monthlyIncome: number;
  riskAppetite: string;
}) {
  return prisma.user.upsert({
    where: { email: userSeed.email },
    update: {
      name: userSeed.name,
      profile: {
        upsert: {
          create: {
            accountBalance: userSeed.accountBalance,
            monthlyIncome: userSeed.monthlyIncome,
            riskAppetite: userSeed.riskAppetite,
          },
          update: {
            accountBalance: userSeed.accountBalance,
            monthlyIncome: userSeed.monthlyIncome,
            riskAppetite: userSeed.riskAppetite,
          },
        },
      },
    },
    create: {
      email: userSeed.email,
      name: userSeed.name,
      passwordHash: `demo-${userSeed.email}`,
      profile: {
        create: {
          accountBalance: userSeed.accountBalance,
          monthlyIncome: userSeed.monthlyIncome,
          riskAppetite: userSeed.riskAppetite,
        },
      },
    },
  });
}

async function ensureCsv(filePath: string): Promise<void> {
  try { await stat(filePath); } 
  catch { await writeFile(filePath, `${CSV_HEADERS.join(",")}\n`, "utf-8"); }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const dataDir = process.env.SHARED_DATA_DIR 
    ? process.env.SHARED_DATA_DIR 
    : path.resolve(process.cwd(), "..", "spark-engine", "data");
    
  const csvPath = path.join(dataDir, "transactions.csv");

  const demoUsers = await Promise.all(DEMO_USERS.map(async (demoUser) => ({
    user: await upsertDemoUser(demoUser),
    baseRisk: demoUser.baseRisk,
    email: demoUser.email,
  })));

  const syntheticTransactions = [];
  const csvRows = [];

  // --- MEGA-SIMULATION: 200 transactions over the last 24 hours ---
  for (let i = 0; i < 200; i++) {
    // 1. Pick a random user, but give our fraudster a higher chance of appearing
    const randomUser = demoUsers[Math.floor(Math.random() * demoUsers.length)];
    const chosenUser = Math.random() > 0.6 ? demoUsers[1] : randomUser; // 40% chance of being the fraudster

    // 2. Generate a random timestamp from the last 24 hours
    const now = new Date();
    const randomMillis = now.getTime() - Math.floor(Math.random() * 24 * 60 * 60 * 1000);
    const eventTime = new Date(randomMillis);
    const hour = eventTime.getHours();

    // 3. Simulate realistic fraud patterns
    let isAnomaly = false;
    let amount = 0;
    let deviceRisk = chosenUser.baseRisk;
    let locationRisk = chosenUser.baseRisk;
    let reason = "Simulated Standard Traffic";

    // Pattern A: Classic Overnight Attack (spike the fraud chart!)
    if (hour >= 1 && hour <= 4) {
      isAnomaly = true;
      locationRisk = 0.9;
      amount = Math.random() * 8000 + 2000; // $2k - $10k
      reason = "Simulated Coordinated Overnight Attack";
    }

    // Pattern B: Designated Fraud Ring User
    if (chosenUser.email === "meera.demo@fraudops.in") {
      isAnomaly = true;
      deviceRisk = 0.85;
      reason = "Simulated Fraud Ring Activity";
    }
    
    // Pattern C: Random large transaction
    if (Math.random() > 0.95) {
      isAnomaly = true;
      reason = "Simulated High-Value Anomaly";
    }

    if (isAnomaly) {
      amount = Math.random() * 4000 + 1000; // $1000 - $5000
    } else {
      amount = Math.random() * 500 + 10; // $10 - $510
    }

    const edgeRisk = isAnomaly ? Math.random() * 0.2 + 0.75 : Math.random() * 0.1;
    const transactionId = `demo_${eventTime.getTime()}_${randomUUID().slice(0, 4)}`;
    const status = edgeRisk > 0.8 ? "blocked" : "approved";

    syntheticTransactions.push({
      publicId: transactionId,
      userId: chosenUser.user.id,
      amount: parseFloat(amount.toFixed(2)),
      eventTime: eventTime,
      hour: hour,
      deviceRisk: deviceRisk,
      locationRisk: locationRisk,
      txnVelocity: Math.floor(Math.random() * 10),
      edgeFraudProbability: edgeRisk,
      status: status,
      reason: reason
    });

    csvRows.push([
      transactionId, chosenUser.user.id, amount.toFixed(2), eventTime.toISOString(), hour,
      deviceRisk, locationRisk, 1, edgeRisk, status
    ].join(","));
  }

  try {
    // 1. Bulk insert into Postgres (Note: createMany doesn't work on all DBs, but is good for demos)
    await prisma.transaction.createMany({
      data: syntheticTransactions,
      skipDuplicates: true,
    });

    // 2. Bulk append to Spark CSV
    await mkdir(dataDir, { recursive: true });
    await ensureCsv(csvPath);
    await appendFile(csvPath, csvRows.join("\n") + "\n", "utf-8");

    return NextResponse.json({ message: `Successfully injected ${syntheticTransactions.length} transactions.` }, { status: 200 });

  } catch (error) {
    console.error("Simulation failed:", error);
    return NextResponse.json({ message: "Failed to generate traffic." }, { status: 500 });
  }
}