import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextApiRequest } from "next";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "2h";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function verifyAdminPassword(plain: string): Promise<boolean> {
  if (ADMIN_PASSWORD_HASH) {
    return bcrypt.compare(plain, ADMIN_PASSWORD_HASH);
  }
  if (ADMIN_PASSWORD) {
    return plain === ADMIN_PASSWORD;
  }
  return false;
}

export function signSession() {
  const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return token;
}

export function verifySession(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

export function getTokenFromReq(req: NextApiRequest) {
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  const match = cookie.split(";").map(c => c.trim()).find(c => c.startsWith("admin_session="));
  if (!match) return null;
  return match.split("=")[1];
}
