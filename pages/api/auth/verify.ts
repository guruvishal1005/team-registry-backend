// pages/api/auth/verify.ts
import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import { setTokenCookie } from "../../../lib/cookie";
import { signSession } from "../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });
  const { email, otp } = req.body || {};
  if (!email || !otp) return res.status(400).json({ success: false, error: "Missing email or otp" });

  try {
    jwt.verify(otp, process.env.RECOVER_TOKEN_SECRET!);
    // optional: check email === ADMIN_EMAIL
    if (email !== process.env.ADMIN_EMAIL) return res.status(401).json({ success: false, error: "Invalid email" });

    const session = signSession();
    setTokenCookie(res, session);
    return res.status(200).json({ success: true, user: { email, role: "admin" } });
  } catch (e) {
    return res.status(401).json({ success: false, error: "Invalid or expired otp" });
  }
}
