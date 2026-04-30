import type { Request } from "express";
import { db, abuseEventsTable } from "@workspace/db";

export type AbuseSeverity = "low" | "medium" | "high";

export interface RecordAbuseInput {
  req?: Request;
  userId?: number | null;
  ip?: string | null;
  type: string;
  severity?: AbuseSeverity;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget abuse logger. Never throws — abuse logging should never break the request.
 */
export async function recordAbuse(input: RecordAbuseInput): Promise<void> {
  try {
    const userId = input.userId ?? input.req?.userId ?? null;
    const ip = input.ip ?? input.req?.ip ?? null;
    await db.insert(abuseEventsTable).values({
      userId: userId ?? null,
      ip,
      eventType: input.type,
      severity: input.severity ?? "low",
      metadata: input.metadata ? JSON.stringify(input.metadata).slice(0, 4000) : null,
    });
  } catch (err) {
    input.req?.log?.warn({ err: String(err), type: input.type }, "abuse log failed");
  }
}
