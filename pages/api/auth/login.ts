// pages/api/auth/login.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { verifyAdminPassword, signSession } from "../../../lib/auth";
import { setTokenCookie } from "../../../lib/cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, error: "Missing email or password" });

  // basic email match
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  if (!ADMIN_EMAIL || email !== ADMIN_EMAIL) {
    return res.status(401).json({ success: false, error: "Invalid credentials" });
  }

  const ok = await verifyAdminPassword(password);
  if (!ok) return res.status(401).json({ success: false, error: "Invalid credentials" });

  const token = signSession();
  setTokenCookie(res, token);

  return res.status(200).json({ success: true, user: { email, role: "admin" } });
}
