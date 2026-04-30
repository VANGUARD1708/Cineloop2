import type { Request } from "express";
import { recordAbuse } from "./abuse";

/**
 * Per-day rolling counter (UTC midnight reset).
 *
 * NOTE: in-memory — fine for single-server deployments. For multi-instance,
 * swap the Map for Redis (INCR + EXPIRE) without changing the call sites.
 */

interface Entry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Entry>();
// Cheap eviction so this map can't grow unbounded across days.
const MAX_BUCKET_ENTRIES = 50_000;

function nextUtcMidnight(): number {
  const now = new Date();
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0,
  ));
  return next.getTime();
}

function getBucket(key: string): Entry {
  const now = Date.now();
  const existing = buckets.get(key);
  if (existing && existing.resetAt > now) return existing;
  if (buckets.size >= MAX_BUCKET_ENTRIES) {
    const oldest = buckets.keys().next().value;
    if (oldest) buckets.delete(oldest);
  }
  const fresh: Entry = { count: 0, resetAt: nextUtcMidnight() };
  buckets.set(key, fresh);
  return fresh;
}

export interface ChatRateLimitInput {
  userId: number | null;
  ip: string | null | undefined;
  isPro: boolean;
}

export interface ChatRateLimitResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  resetAt: number;
}

export const CHAT_LIMIT_FREE = 5;
export const CHAT_LIMIT_PRO = 100;
export const CHAT_LIMIT_ANON = 3;

/** Check current quota WITHOUT incrementing — used by /identity/me. */
export function chatQuotaSnapshot(input: ChatRateLimitInput): ChatRateLimitResult {
  const limit = input.userId
    ? input.isPro
      ? CHAT_LIMIT_PRO
      : CHAT_LIMIT_FREE
    : CHAT_LIMIT_ANON;
  const key = input.userId ? `u:${input.userId}` : `ip:${input.ip ?? "unknown"}`;
  const b = getBucket(key);
  return {
    allowed: b.count < limit,
    used: b.count,
    limit,
    remaining: Math.max(0, limit - b.count),
    resetAt: b.resetAt,
  };
}

/** Increment-and-check. Records an abuse event when the user goes over. */
export async function chatRateLimit(
  req: Request,
  input: ChatRateLimitInput,
): Promise<ChatRateLimitResult> {
  const limit = input.userId
    ? input.isPro
      ? CHAT_LIMIT_PRO
      : CHAT_LIMIT_FREE
    : CHAT_LIMIT_ANON;
  const key = input.userId ? `u:${input.userId}` : `ip:${input.ip ?? "unknown"}`;
  const b = getBucket(key);

  if (b.count >= limit) {
    void recordAbuse({
      req,
      userId: input.userId,
      type: "rate_limit_chat",
      severity: "low",
      metadata: { limit, key },
    });
    return {
      allowed: false,
      used: b.count,
      limit,
      remaining: 0,
      resetAt: b.resetAt,
    };
  }

  b.count += 1;
  return {
    allowed: true,
    used: b.count,
    limit,
    remaining: Math.max(0, limit - b.count),
    resetAt: b.resetAt,
  };
}
