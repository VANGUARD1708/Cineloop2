import type { Request, Response, NextFunction } from "express";
import { getUserById, isProActive } from "./identity";

declare module "express-serve-static-core" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Request {
    /** Loaded by requireAuth/loadUserIfPresent — never trust without going through a guard. */
    authUser?: {
      id: number;
      email: string | null;
      isPro: boolean;
      isAdmin: boolean;
      isBanned: boolean;
    };
  }
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Centralized "is this user an admin?" check.
 * Sources:
 *   - users.is_admin = true  (DB-promoted admins)
 *   - email present in ADMIN_EMAILS env var (csv allowlist)
 *   - DEV ONLY: user id === 1 when ADMIN_EMAILS is empty (so the app is testable out of the box)
 */
export function isAdminUser(user: {
  id: number;
  email: string | null;
  isAdmin: boolean;
}): boolean {
  if (user.isAdmin) return true;
  const emails = adminEmails();
  if (user.email && emails.includes(user.email.toLowerCase())) return true;
  if (emails.length === 0 && user.id === 1 && process.env.NODE_ENV !== "production") {
    return true;
  }
  return false;
}

/**
 * Loads req.authUser if a session cookie is present. Does NOT reject anonymous requests.
 * Useful for endpoints that change behavior based on Pro/admin status (e.g. best-clip).
 */
export async function loadUserIfPresent(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.userId) {
    next();
    return;
  }
  try {
    const user = await getUserById(req.userId);
    if (user) {
      req.authUser = {
        id: user.id,
        email: user.email,
        isPro: isProActive(user),
        isAdmin: isAdminUser(user),
        isBanned: user.isBanned,
      };
    }
  } catch (err) {
    req.log?.warn({ err: String(err) }, "loadUserIfPresent failed");
  }
  next();
}

/** 401 if not signed in; 403 if banned. Always loads req.authUser on success. */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.userId) {
    res.status(401).json({ error: "auth_required" });
    return;
  }
  void (async () => {
    const user = await getUserById(req.userId!);
    if (!user) {
      res.status(401).json({ error: "auth_required" });
      return;
    }
    if (user.isBanned) {
      res.status(403).json({ error: "account_banned", reason: user.bannedReason ?? null });
      return;
    }
    req.authUser = {
      id: user.id,
      email: user.email,
      isPro: isProActive(user),
      isAdmin: isAdminUser(user),
      isBanned: user.isBanned,
    };
    next();
  })();
}

/** 401 if not signed in, 403 if not an admin. */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.userId) {
    res.status(401).json({ error: "auth_required" });
    return;
  }
  void (async () => {
    const user = await getUserById(req.userId!);
    if (!user) {
      res.status(401).json({ error: "auth_required" });
      return;
    }
    if (user.isBanned) {
      res.status(403).json({ error: "account_banned" });
      return;
    }
    const admin = isAdminUser(user);
    if (!admin) {
      res.status(403).json({ error: "admin_required" });
      return;
    }
    req.authUser = {
      id: user.id,
      email: user.email,
      isPro: isProActive(user),
      isAdmin: true,
      isBanned: user.isBanned,
    };
    next();
  })();
}
