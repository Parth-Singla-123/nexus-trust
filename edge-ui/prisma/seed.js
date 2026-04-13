const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

async function upsertUserWithProfile({ name, email, plainPassword, accountBalance, monthlyIncome, riskAppetite }) {
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      profile: {
        upsert: {
          create: {
            accountBalance,
            monthlyIncome,
            riskAppetite,
          },
          update: {
            accountBalance,
            monthlyIncome,
            riskAppetite,
          },
        },
      },
    },
    create: {
      name,
      email,
      passwordHash,
      profile: {
        create: {
          accountBalance,
          monthlyIncome,
          riskAppetite,
        },
      },
    },
  });
}

async function upsertTransaction(txn) {
  await prisma.transaction.upsert({
    where: { publicId: txn.publicId },
    update: txn,
    create: txn,
  });
}

async function main() {
  const alice = await upsertUserWithProfile({
    name: "Alice Menon",
    email: "alice@fraudops.demo",
    plainPassword: "Alice@1234",
    accountBalance: 900000,
    monthlyIncome: 150000,
    riskAppetite: "balanced",
  });

  const bob = await upsertUserWithProfile({
    name: "Bob Khanna",
    email: "bob@fraudops.demo",
    plainPassword: "Bob@1234",
    accountBalance: 620000,
    monthlyIncome: 120000,
    riskAppetite: "conservative",
  });

  const seedTransactions = [
    {
      publicId: "seed_txn_001",
      userId: alice.id,
      amount: 2500,
      eventTime: hoursAgo(2),
      hour: new Date().getHours(),
      deviceRisk: 0.12,
      locationRisk: 0.08,
      txnVelocity: 1,
      edgeFraudProbability: 0.13,
      status: "approved",
      reason: "standard transaction pattern",
    },
    {
      publicId: "seed_txn_002",
      userId: alice.id,
      amount: 480000,
      eventTime: hoursAgo(10),
      hour: 3,
      deviceRisk: 0.91,
      locationRisk: 0.84,
      txnVelocity: 4,
      edgeFraudProbability: 0.95,
      status: "blocked",
      reason: "high transfer amount, odd-hour activity, high device risk, high location risk",
    },
    {
      publicId: "seed_txn_003",
      userId: bob.id,
      amount: 18000,
      eventTime: hoursAgo(5),
      hour: 16,
      deviceRisk: 0.27,
      locationRisk: 0.31,
      txnVelocity: 2,
      edgeFraudProbability: 0.26,
      status: "approved",
      reason: "standard transaction pattern",
    },
    {
      publicId: "seed_txn_004",
      userId: bob.id,
      amount: 320000,
      eventTime: hoursAgo(14),
      hour: 2,
      deviceRisk: 0.72,
      locationRisk: 0.77,
      txnVelocity: 5,
      edgeFraudProbability: 0.88,
      status: "blocked",
      reason: "high transfer amount, odd-hour activity, high location risk",
    },
  ];

  for (const txn of seedTransactions) {
    await upsertTransaction(txn);
  }

  console.log("Seed complete.");
  console.log("Users:");
  console.log("- alice@fraudops.demo / Alice@1234");
  console.log("- bob@fraudops.demo / Bob@1234");
  console.log(`Transactions seeded: ${seedTransactions.length}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
