// pages/api/_debug_env.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow local requests for safety
  const host = req.headers.host || "";
  if (!host.startsWith("localhost") && !host.startsWith("127.0.0.1")) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? null;
  const hasAdminPasswordHash = !!process.env.ADMIN_PASSWORD_HASH;
  const hasAdminPassword = !!process.env.ADMIN_PASSWORD;

  return res.status(200).json({
    ok: true,
    ADMIN_EMAIL: adminEmail,
    ADMIN_PASSWORD_SET: hasAdminPassword,        // true/false (no value shown)
    ADMIN_PASSWORD_HASH_SET: hasAdminPasswordHash
  });
}
