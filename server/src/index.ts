import "dotenv/config";
import express from "express";
import cors from "cors";
import type { RequestHandler } from "express";
import { loadEnv } from "./lib/env.js";
import { createRedis } from "./lib/redis.js";
import { buildAuthRouter } from "./routes/auth.routes.js";
import { buildContestRouter } from "./routes/contest.routes.js";
import { buildTagRouter } from "./routes/tag.routes.js";
import { buildAdminRouter } from "./routes/admin.routes.js";
import { createAuthMiddleware, createAdminMiddleware } from "./middleware/auth.js";
import { registerContestCron } from "./jobs/contestCron.js";
import { ONBOARDING_QUESTIONS } from "./lib/onboardingQuestions.js";

const env = loadEnv();
const redis = createRedis(env);
const app = express();
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const auth = createAuthMiddleware(env) as RequestHandler;
const adminMw = createAdminMiddleware(env) as RequestHandler;

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/quiz/questions", (_req, res) => {
  res.json({ questions: ONBOARDING_QUESTIONS });
});

app.use("/auth", buildAuthRouter(env));
app.use("/contest", buildContestRouter(redis, auth));
app.use("/tags", auth, buildTagRouter(redis));
app.use("/admin", adminMw, buildAdminRouter(env));

registerContestCron(env, redis);

app.listen(env.PORT, () => {
  console.info(`Tag App API listening on :${env.PORT}`);
});
