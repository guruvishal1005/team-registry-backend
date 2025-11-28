import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../lib/db";
import { requireAdmin } from "../../../lib/authMiddleware";
import { pushAudit } from "../../../lib/audit";
import { ObjectId } from "mongodb";

async function GET(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await getDb();
    const col = db.collection("teams");
    const {
      search,
      sortBy = "registrationDate",
      sortOrder = "desc",
      paymentStatus,
      college,
      dateFrom,
      dateTo,
      limit = "20",
      offset = "0",
    } = req.query as any;

    const q: any = {};
    if (search) {
      const s = new RegExp(search, "i");
      q.$or = [
        { teamName: s },
        { leaderName: s },
        { "participants.name": s },
        { "participants.college": s },
        { transactionId: s },
      ];
    }

    if (paymentStatus && paymentStatus !== "all") q.paymentStatus = paymentStatus;
    if (college && college !== "all") q["participants.college"] = college;

    if (dateFrom || dateTo) {
      q.registrationDate = {};
      if (dateFrom) q.registrationDate.$gte = new Date(dateFrom).toISOString();
      if (dateTo) q.registrationDate.$lte = new Date(dateTo).toISOString();
    }

    const sort: any = { [sortBy]: sortOrder === "desc" ? -1 : 1 };
    const lim = Math.min(parseInt(limit as string, 10) || 20, 200);
    const off = Math.max(parseInt(offset as string, 10) || 0, 0);

    const total = await col.countDocuments(q);
    const docs = await col.find(q).sort(sort).skip(off).limit(lim).toArray();

    return res.status(200).json({ success: true, teams: docs, total });
  } catch (err: any) {
    console.error("GET /api/teams error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function POST(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await getDb();
    const col = db.collection("teams");
    const payload = req.body;

    const required = [
      "teamName",
      "leaderName",
      "participants",
      "registrationDate",
      "transactionId",
      "paymentStatus",
      "numberOfParticipants",
    ];
    for (const f of required) {
      if (payload[f] === undefined) return res.status(400).json({ success: false, error: `Missing ${f}` });
    }

    if (!Array.isArray(payload.participants) || payload.participants.length !== payload.numberOfParticipants) {
      return res.status(400).json({ success: false, error: "participants must match numberOfParticipants" });
    }

    // ensure transactionId uniqueness
    const exists = await col.findOne({ transactionId: payload.transactionId });
    if (exists) return res.status(409).json({ success: false, error: "Duplicate transactionId" });

    const insertRes = await col.insertOne(payload);
    // fetch inserted document to return exact format with _id
    const created = await col.findOne({ _id: insertRes.insertedId });

    pushAudit({
      teamId: (created && created.transactionId) || insertRes.insertedId.toString(),
      action: "create",
      timestamp: new Date().toISOString(),
      details: payload.teamName,
    });

    return res.status(201).json({ success: true, team: created });
  } catch (err: any) {
    console.error("POST /api/teams error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export default requireAdmin(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") return GET(req, res);
  if (req.method === "POST") return POST(req, res);
  return res.status(405).json({ success: false, error: "Method not allowed" });
});
