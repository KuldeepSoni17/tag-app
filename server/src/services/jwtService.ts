import jwt, { type JwtPayload as LibJwtPayload, type Secret, type SignOptions } from "jsonwebtoken";
import type { Env } from "../lib/env.js";

export type AuthTokenPayload = { sub: string; phoneHash: string };

export function signUserToken(env: Env, userId: string, phoneHash: string): string {
  const payload: AuthTokenPayload = { sub: userId, phoneHash };
  const options: SignOptions = { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_SECRET as Secret, options);
}

export function verifyUserToken(env: Env, token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET as Secret);
  if (typeof decoded === "string" || !decoded || typeof decoded !== "object") {
    throw new Error("Invalid token");
  }
  const sub = (decoded as LibJwtPayload).sub;
  const ph = (decoded as AuthTokenPayload).phoneHash;
  if (!sub || !ph) throw new Error("Invalid token payload");
  return { sub, phoneHash: ph };
}
