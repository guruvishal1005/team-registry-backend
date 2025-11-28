import type { NextApiRequest, NextApiResponse } from "next";
import { getTokenFromReq, verifySession } from "./auth";

export function requireAdmin(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<any> | any) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = getTokenFromReq(req);
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const payload = verifySession(token);
    if (!payload || !(payload as any).admin) return res.status(401).json({ error: "Unauthorized" });
    return handler(req, res);
  };
}
