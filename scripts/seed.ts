// scripts/seed.ts
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { getDb } from "../lib/db"; // remove explicit .ts extension to satisfy TypeScript compiler
import { randomUUID } from "crypto";

async function seed() {
  try {
    const db = await getDb();
    const col = db.collection("teams");

    console.log("Clearing existing teams...");
    await col.deleteMany({});

    console.log("Inserting sample teams...");

    const sample = [];
    for (let i = 1; i <= 30; i++) {
      const leader = {
        name: `Leader ${i}`,
        email: `leader${i}@example.com`,
        phone: `90000${(1000 + i).toString().slice(-6)}`,
        college: `College ${((i % 6) + 1)}`
      };
      const members = [leader];
      for (let j = 1; j < ((i % 4) + 1); j++) {
        members.push({
          name: `Member ${i}-${j}`,
          email: `member${i}${j}@example.com`,
          phone: `80000${(2000 + i + j).toString().slice(-6)}`,
          college: leader.college
        });
      }
      sample.push({
        teamName: `Team ${i}`,
        leaderName: leader.name,
        numberOfParticipants: members.length,
        participants: members,
        registrationDate: new Date(Date.now() - i * 86400000).toISOString(),
        transactionId: `TXN-${randomUUID()}`,
        paymentStatus: i % 3 === 0 ? "Unpaid" : "Paid"
      });
    }

    await col.insertMany(sample);
    console.log("Inserted sample teams:", sample.length);
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
}

seed();
