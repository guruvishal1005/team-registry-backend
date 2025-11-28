import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../lib/db";
import { requireAdmin } from "../../../lib/authMiddleware";
import { ObjectId } from "mongodb";
import { pushAudit } from "../../../lib/audit";

export default requireAdmin(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const body = req.body || {};

  // Accept either teamIds (contract) or ids (legacy)
  const ids: string[] = Array.isArray(body.teamIds) ? body.teamIds : Array.isArray(body.ids) ? body.ids : [];
  const action: string = body.action;
  const db = await getDb();
  const col = db.collection("teams");

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, error: "teamIds required" });
  }

  try {
    if (action === "delete") {
      const objIds = ids.map((i: string) => new ObjectId(i));
      const r = await col.deleteMany({ _id: { $in: objIds } });
      ids.forEach(id => pushAudit({ teamId: id, action: "bulk-delete", timestamp: new Date().toISOString() }));
      return res.status(200).json({ success: true, count: r.deletedCount });
    }

    if (action === "updatePaymentStatus") {
      const status = body.paymentStatus;
      if (!status) return res.status(400).json({ success: false, error: "paymentStatus required" });
      const objIds = ids.map((i: string) => new ObjectId(i));
      const r = await col.updateMany({ _id: { $in: objIds } }, { $set: { paymentStatus: status } });
      ids.forEach(id => pushAudit({ teamId: id, action: `bulk-status-${status}`, timestamp: new Date().toISOString() }));
      return res.status(200).json({ success: true, count: r.modifiedCount });
    }

    if (action === "export") {
      const objIds = ids.map((i: string) => new ObjectId(i));
      const docs = await col.find({ _id: { $in: objIds } }).toArray();
      // return teams in contract format
      return res.status(200).json({ success: true, teams: docs, count: docs.length });
    }

    return res.status(400).json({ success: false, error: "Unknown action" });
  } catch (err: any) {
    console.error("POST /api/teams/bulk error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});
