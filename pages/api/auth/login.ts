// pages/api/auth/login.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { verifyAdminPassword, signSession, getAdminAllowlist } from "../../../lib/auth";
import { setTokenCookie } from "../../../lib/cookie";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, error: "Missing email or password" });

  // debug: log allowlist size in non-production so you can see whether ADMIN_LIST loaded
  try {
    const allowlist = getAdminAllowlist();
    if (process.env.NODE_ENV !== "production") {
      console.debug("[auth/login] allowlist entries:", allowlist ? allowlist.length : 0);
    }
  } catch (e) {
    console.warn("[auth/login] getAdminAllowlist() error", e);
  }

  const allowlist = getAdminAllowlist();
  const normalizedEmail = String(email).toLowerCase();
  const found = allowlist.find((a) => a.email === normalizedEmail);
  if (!found) {
    return res.status(401).json({ success: false, error: "Invalid credentials" });
  }

  const ok = await verifyAdminPassword(normalizedEmail, password);
  if (!ok) {
    return res.status(401).json({ success: false, error: "Invalid credentials" });
  }

  // create token with admin=true and email
  const token = signSession(normalizedEmail);
  setTokenCookie(res, token);

  return res.status(200).json({
    success: true,
    user: { email }
  });
}
