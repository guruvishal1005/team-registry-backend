import type { NextApiRequest, NextApiResponse } from "next";
import { getDb } from "../../lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const db = await getDb();
    const col = db.collection("teams");
    const total = await col.countDocuments();
    const paid = await col.countDocuments({ paymentStatus: "Paid" });
    const unpaid = await col.countDocuments({ paymentStatus: "Unpaid" });

    // registrations over time (grouped by day)
    const pipeline = [
      { $project: { day: { $substr: ["$registrationDate", 0, 10] } } }, // YYYY-MM-DD
      { $group: { _id: "$day", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ];
    const trend = await col.aggregate(pipeline).toArray();

    // top colleges by participant count
    const pop = await col.aggregate([
      { $unwind: "$participants" },
      { $group: { _id: "$participants.college", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    return res.status(200).json({
      success: true,
      totalTeams: total,
      paidTeams: paid,
      unpaidTeams: unpaid,
      registrationsByDate: trend.map((t: any) => ({ date: t._id, count: t.count })),
      topColleges: pop.map((p: any) => ({ college: p._id, count: p.count })),
    });
  } catch (err: any) {
    console.error("GET /api/stats error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
