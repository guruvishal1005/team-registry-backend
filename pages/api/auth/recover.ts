import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";

const RECOVER_TOKEN_SECRET = process.env.RECOVER_TOKEN_SECRET!;
const RECOVER_EXP_MIN = parseInt(process.env.RECOVER_TOKEN_EXPIRY_MIN || "15", 10);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
const FRONTEND_BASE = process.env.FRONTEND_BASE_URL || "http://localhost:8080";

async function sendEmail(to: string, subject: string, text: string) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn("No SENDGRID_API_KEY — skipping email (print token to log)");
    console.log("RECOVER TEXT:", text);
    return;
  }
  const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: process.env.EMAIL_FROM || "noreply@example.com" },
      subject,
      content: [{ type: "text/plain", value: text }]
    }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    console.error("Sendgrid error", body);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { email } = req.body || {};
  if (!email || email !== ADMIN_EMAIL) return res.status(400).json({ error: "Invalid email" });
  const token = jwt.sign({ adminRecover: true }, RECOVER_TOKEN_SECRET, { expiresIn: `${RECOVER_EXP_MIN}m` });
  const link = `${FRONTEND_BASE}/admin/recover?token=${token}`;
  const text = `Use this link to sign in (valid for ${RECOVER_EXP_MIN} minutes):\n\n${link}`;
  await sendEmail(email, "Admin recovery link", text);
  res.status(200).json({ success: true });
}
