import { serialize } from "cookie";
export const COOKIE_NAME = "admin_session";

export function setTokenCookie(res, token: string, maxAgeSeconds = 60 * 60 * 2) {
  const cookie = serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
  res.setHeader("Set-Cookie", cookie);
}

export function removeTokenCookie(res) {
  const cookie = serialize(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: -1,
  });
  res.setHeader("Set-Cookie", cookie);
}
