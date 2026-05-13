import type { Env } from "../lib/env.js";
import { sha256Hex } from "../lib/crypto.js";

/** Normalise Indian-style numbers to E.164 (+91…). Extend as needed. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.startsWith("91") && digits.length === 12) {
    return `+${digits}`;
  }
  if (raw.startsWith("+")) {
    return `+${digits}`;
  }
  throw new Error("Unsupported phone format");
}

export function phoneHash(env: Env, normalized: string): string {
  return sha256Hex(`${normalized}:${env.PHONE_PEPPER}`);
}
