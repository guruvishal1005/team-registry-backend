// lib/auth.ts
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextApiRequest } from "next";

const JWT_SECRET = process.env.JWT_SECRET || "change_this_in_production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "2h";

type AdminEntry = {
  email: string;
  passwordHash?: string; // bcrypt hash
  password?: string; // plain-text (not recommended)
};

function safeJsonParse<T = any>(raw: string | undefined): T | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (s.length === 0) return null;

  // tolerate single quotes sometimes used when setting env values
  const normalized = s.replace(/\n/g, " ").replace(/'\s*([\[{])/g, "$1").replace(/([\]\}])\s*'/g, "$1");

  try {
    return JSON.parse(s);
  } catch (e1) {
    try {
      return JSON.parse(normalized);
    } catch (e2) {
      // last attempt: try to replace trailing commas
      const noTrailingCommas = normalized.replace(/,(\s*[}\]])/g, "$1");
      try {
        return JSON.parse(noTrailingCommas);
      } catch (e3) {
        console.warn("safeJsonParse: failed to parse ADMIN_LIST", e3);
        return null;
      }
    }
  }
}

/** Fix common accidental escapes:
 * - Some infra or copy/paste may add an extra leading `$` (e.g. `$$2b$...`) — convert that to `$2b$...`
 * - Trim surrounding whitespace
 */
function sanitizeHash(h?: string): string | undefined {
  if (!h || typeof h !== "string") return undefined;
  let s = h.trim();
  // fix double-dollar prefix -> single $
  if (s.startsWith("$$")) s = s.slice(1);
  // sometimes people escape $ with backslash, remove those
  s = s.replace(/\\\$/g, "$");
  // ensure it still looks like a bcrypt hash (best-effort)
  if (s.startsWith("$2a$") || s.startsWith("$2b$") || s.startsWith("$2y$")) return s;
  // if it doesn't look like bcrypt, return as-is (compare will fail)
  return s;
}

function normalizeEntry(p: any): AdminEntry | null {
  if (!p || !p.email) return null;
  return {
    email: String(p.email).toLowerCase(),
    passwordHash: sanitizeHash(p.passwordHash),
    password: typeof p.password === "string" ? p.password : undefined,
  };
}

function loadAdminsFromEnv(): AdminEntry[] | null {
  const raw = process.env.ADMIN_LIST;
  if (!raw) return null;

  const parsed = safeJsonParse<any[]>(raw);
  if (!parsed || !Array.isArray(parsed)) return null;

  const out: AdminEntry[] = [];
  for (const p of parsed) {
    const e = normalizeEntry(p);
    if (e) out.push(e);
  }
  return out.length ? out : null;
}

function loadAdminsFromFile(): AdminEntry[] | null {
  try {
    const cfgPath = path.join(process.cwd(), "config", "admins.json");
    if (!fs.existsSync(cfgPath)) return null;
    const raw = fs.readFileSync(cfgPath, "utf8");
    const parsed = safeJsonParse<any[]>(raw);
    if (!parsed || !Array.isArray(parsed)) return null;
    const out: AdminEntry[] = [];
    for (const p of parsed) {
      const e = normalizeEntry(p);
      if (e) out.push(e);
    }
    return out.length ? out : null;
  } catch (e) {
    console.warn("Failed to load config/admins.json:", e);
    return null;
  }
}

function loadAdminsFallback(): AdminEntry[] {
  const singleEmail = process.env.ADMIN_EMAIL;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const password = process.env.ADMIN_PASSWORD;
  if (!singleEmail) return [];
  return [
    {
      email: singleEmail.toLowerCase(),
      passwordHash: sanitizeHash(passwordHash),
      password: typeof password === "string" ? password : undefined,
    },
  ];
}

/** Returns allowlist loaded from env / file / fallback */
export function getAdminAllowlist(): AdminEntry[] {
  const fromEnv = loadAdminsFromEnv();
  if (fromEnv && fromEnv.length) return fromEnv;
  const fromFile = loadAdminsFromFile();
  if (fromFile && fromFile.length) return fromFile;
  return loadAdminsFallback();
}

/**
 * Verify password for a specific admin email.
 * Returns true if valid; false otherwise.
 */
export async function verifyAdminPassword(email: string, plain: string): Promise<boolean> {
  if (!email) return false;
  const list = getAdminAllowlist();
  const entry = list.find((e) => e.email === email.toLowerCase());
  if (!entry) return false;

  if (entry.passwordHash) {
    try {
      return await bcrypt.compare(plain, entry.passwordHash);
    } catch (err) {
      console.error("bcrypt.compare error", err);
      return false;
    }
  }

  // fallback to plaintext if present (NOT recommended)
  if (entry.password) {
    return entry.password === plain;
  }

  return false;
}

/** Sign a session JWT for the provided admin email */
export function signSession(email: string) {
  const payload = { admin: true, email };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/** Verify a session JWT; returns payload or null */
export function verifySession(token: string) {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

/** Extract admin_session cookie from Next.js request */
export function getTokenFromReq(req: NextApiRequest) {
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  const match = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("admin_session="));
  if (!match) return null;
  return match.split("=")[1];
}
