import type { Request, Response, NextFunction } from "express";
import type { Env } from "../lib/env.js";
import { verifyUserToken } from "../services/jwtService.js";

export type AuthedRequest = Request & { userId?: string; phoneHash?: string };

export function createAuthMiddleware(env: Env) {
  return function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing bearer token" });
    }
    const token = header.slice("Bearer ".length);
    try {
      const payload = verifyUserToken(env, token);
      req.userId = payload.sub;
      req.phoneHash = payload.phoneHash;
      return next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}

export function createAdminMiddleware(env: Env) {
  return function adminMiddleware(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing admin token" });
    }
    const token = header.slice("Bearer ".length);
    if (token !== env.ADMIN_SECRET) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}
