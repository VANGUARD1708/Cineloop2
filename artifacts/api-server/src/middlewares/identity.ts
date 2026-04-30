import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const COOKIE_NAME = "cl_uid";

function resolveSecret(): string {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    // Hard fail in production — refuse to mint forgeable cookies.
    throw new Error(
      "SESSION_SECRET is required in production (must be >= 16 chars). " +
        "Refusing to start with a default secret.",
    );
  }
  // Development only: random per-process secret. Cookies will be invalidated
  // every restart, but they cannot be forged.
  // eslint-disable-next-line no-console
  console.warn(
    "[identity] SESSION_SECRET missing or too short — using a random ephemeral dev secret. Cookies will not survive restarts.",
  );
  return crypto.randomBytes(32).toString("hex");
}

const SECRET = resolveSecret();

declare module "express-serve-static-core" {
  interface Request {
    userId?: number;
  }
}

function sign(value: string): string {
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex").slice(0, 32);
}

export function encodeIdentity(userId: number): string {
  const v = String(userId);
  return `${v}.${sign(v)}`;
}

export function decodeIdentity(raw: string | undefined): number | null {
  if (!raw) return null;
  const [v, sig] = raw.split(".");
  if (!v || !sig) return null;
  if (sign(v) !== sig) return null;
  const id = parseInt(v, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function setIdentityCookie(res: Response, userId: number): void {
  res.cookie(COOKIE_NAME, encodeIdentity(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

export function clearIdentityCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function identityMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const raw = req.cookies?.[COOKIE_NAME];
  const id = decodeIdentity(raw);
  if (id) req.userId = id;
  next();
}
