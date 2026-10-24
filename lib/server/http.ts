import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { ApiError, ErrorState } from "@/lib/schemas";
import { AiError } from "./gemini";
import { rateLimit, type Limit } from "./rateLimit";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    public state: ErrorState = "reconnecting",
    public retryAfter?: number,
  ) {
    super(code);
  }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export function limit(req: Request, bucket: string, rule: Limit, key = clientIp(req)) {
  const r = rateLimit(`${bucket}:${key}`, rule);
  if (!r.ok) throw new HttpError(429, "rate_limited", "reconnecting", r.retryAfter);
}

export async function readJson<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "invalid_json");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    console.warn("[api] bad input:", z.prettifyError(parsed.error));
    throw new HttpError(400, "invalid_input");
  }
  return parsed.data;
}

/** Validates our own response too, so the screens only ever get the designed shape. */
export function ok<T>(schema: z.ZodType<T>, data: T) {
  return NextResponse.json(schema.parse(data));
}

/** Maps every failure to an error state from design/reference/orb-states-and-errors.html. */
export function fail(e: unknown) {
  let status = 500;
  let body: ApiError = { error: "server_error", state: "reconnecting" };
  if (e instanceof HttpError) {
    status = e.status;
    body = { error: e.code, state: e.state, retryAfter: e.retryAfter };
  } else if (e instanceof AiError) {
    status = e.kind === "timeout" ? 504 : e.kind === "config" ? 500 : 502;
    body = { error: `ai_${e.kind}`, state: "reconnecting" };
    if (e.kind === "config") console.error(`[api] ${e.message}`);
  } else {
    console.error("[api] unexpected", e);
  }
  const res = NextResponse.json(body, { status });
  if (body.retryAfter) res.headers.set("Retry-After", String(body.retryAfter));
  return res;
}
