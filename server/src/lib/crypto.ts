import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

/** Encrypt a UTF-8 string; returns base64-ish components for DB storage. */
export function encryptString(plain: string, keyHex: string): { ciphertext: string; iv: string; authTag: string } {
  const key = Buffer.from(keyHex, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: enc.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptString(parts: { ciphertext: string; iv: string; authTag: string }, keyHex: string): string {
  const key = Buffer.from(keyHex, "hex");
  const iv = Buffer.from(parts.iv, "base64");
  const authTag = Buffer.from(parts.authTag, "base64");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const dec = Buffer.concat([decipher.update(Buffer.from(parts.ciphertext, "base64")), decipher.final()]);
  return dec.toString("utf8");
}

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}
