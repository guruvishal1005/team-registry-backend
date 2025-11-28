import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../../lib/db";
import { requireAdmin } from "../../../lib/authMiddleware";
import { Parser as Json2csvParser } from "json2csv";
import { ObjectId } from "mongodb";

export default requireAdmin(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ success: false, error: "Method not allowed" });

  try {
    const { format = "csv", teamIds, ids } = req.query as any;
    const db = await getDb();
    const col = db.collection("teams");

    let docs;
    const idParam = teamIds || ids;
    if (idParam) {
      const arr = (idParam as string).split(",").map(s => s.trim()).filter(Boolean);
      const objIds = arr.map(id => {
        try { return new ObjectId(id); } catch (e) { return null; }
      }).filter(Boolean);
      docs = await col.find({ _id: { $in: objIds } }).toArray();
    } else {
      docs = await col.find({}).toArray();
    }

    if (format === "json") {
      // match contract: return teams array
      return res.status(200).json({ success: true, teams: docs });
    }

    // CSV: one row per team, participants as JSON string
    const flattened = docs.map(d => ({
      _id: d._id.toString(),
      teamName: d.teamName,
      leaderName: d.leaderName,
      numberOfParticipants: d.numberOfParticipants,
      participants: JSON.stringify(d.participants),
      registrationDate: d.registrationDate,
      transactionId: d.transactionId,
      paymentStatus: d.paymentStatus
    }));

    const fields = ["_id", "teamName", "leaderName", "numberOfParticipants", "participants", "registrationDate", "transactionId", "paymentStatus"];
    const json2csv = new Json2csvParser({ fields });
    const csv = json2csv.parse(flattened);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="teams_export.csv"`);
    return res.status(200).send(csv);
  } catch (err: any) {
    console.error("GET /api/teams/export error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});
