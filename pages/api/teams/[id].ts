import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../lib/db";
import { ObjectId } from "mongodb";
import { requireAdmin } from "../../../lib/authMiddleware";
import { pushAudit, getRecentForTeam } from "../../../lib/audit";

async function GET(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await getDb();
    const col = db.collection("teams");
    const { id } = req.query;

    let oid: ObjectId;
    try {
      oid = new ObjectId(id as string);
    } catch (e) {
      return res.status(400).json({ success: false, error: "Invalid id" });
    }

    const doc = await col.findOne({ _id: oid });
    if (!doc) return res.status(404).json({ success: false, error: "Not found" });

    // include ephemeral audit entries (optional field)
    const audit = getRecentForTeam(id as string);
    return res.status(200).json({ success: true, team: { ...doc, audit } });
  } catch (err: any) {
    console.error("GET /api/teams/:id error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function PUT(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await getDb();
    const col = db.collection("teams");
    const { id } = req.query;
    const payload = req.body;

    let oid: ObjectId;
    try {
      oid = new ObjectId(id as string);
    } catch (e) {
      return res.status(400).json({ success: false, error: "Invalid id" });
    }

    const allowed = ["teamName", "leaderName", "participants", "registrationDate", "transactionId", "paymentStatus", "numberOfParticipants"];
    for (const k of Object.keys(payload)) {
      if (!allowed.includes(k)) return res.status(400).json({ success: false, error: `Unexpected field: ${k}` });
    }

    if (payload.participants && payload.numberOfParticipants && payload.participants.length !== payload.numberOfParticipants) {
      return res.status(400).json({ success: false, error: "participants length must match numberOfParticipants" });
    }

    const resu = await col.updateOne({ _id: oid }, { $set: payload });
    if (resu.matchedCount === 0) return res.status(404).json({ success: false, error: "Not found" });

    pushAudit({ teamId: id as string, action: "update", timestamp: new Date().toISOString(), details: JSON.stringify(Object.keys(payload)) });

    const updated = await col.findOne({ _id: oid });
    return res.status(200).json({ success: true, team: updated });
  } catch (err: any) {
    console.error("PUT /api/teams/:id error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function DELETE(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await getDb();
    const col = db.collection("teams");
    const { id } = req.query;

    let oid: ObjectId;
    try {
      oid = new ObjectId(id as string);
    } catch (e) {
      return res.status(400).json({ success: false, error: "Invalid id" });
    }

    const result = await col.deleteOne({ _id: oid });
    if (result.deletedCount === 0) return res.status(404).json({ success: false, error: "Not found" });

    pushAudit({ teamId: id as string, action: "delete", timestamp: new Date().toISOString() });

    return res.status(200).json({ success: true, count: result.deletedCount });
  } catch (err: any) {
    console.error("DELETE /api/teams/:id error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export default requireAdmin(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") return GET(req, res);
  if (req.method === "PUT") return PUT(req, res);
  if (req.method === "DELETE") return DELETE(req, res);
  return res.status(405).json({ success: false, error: "Method not allowed" });
});
