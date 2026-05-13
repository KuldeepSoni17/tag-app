import { Router } from "express";
import type { Env } from "../lib/env.js";
import { requestOtp } from "../services/otpService.js";
import { registerUser, loginUser } from "../services/authService.js";

export function buildAuthRouter(env: Env) {
  const r = Router();

  r.post("/otp/request", async (req, res) => {
    try {
      const phone = String(req.body?.phone ?? "");
      await requestOtp(env, phone);
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  r.post("/register", async (req, res) => {
    try {
      const clientIp = req.ip;
      const out = await registerUser(env, {
        phone: String(req.body?.phone ?? ""),
        otp: String(req.body?.otp ?? ""),
        username: req.body?.username ? String(req.body.username) : undefined,
        answers: (req.body?.answers ?? {}) as Record<string, string>,
        clientIp,
      });
      res.json({
        token: out.token,
        user: { id: out.user.id, username: out.user.username, avatarUrl: out.user.avatarUrl },
      });
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  r.post("/login", async (req, res) => {
    try {
      const clientIp = req.ip;
      const out = await loginUser(env, {
        phone: String(req.body?.phone ?? ""),
        otp: String(req.body?.otp ?? ""),
        clientIp,
      });
      res.json({
        token: out.token,
        user: { id: out.user.id, username: out.user.username, avatarUrl: out.user.avatarUrl },
      });
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  return r;
}
