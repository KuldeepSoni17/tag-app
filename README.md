# Tag App

Daily social chain game: mobile client (Expo) + API (Express + Prisma) + PostgreSQL + Redis.

## Layout

- `server/` — REST API, cron jobs, admin routes, Prisma schema
- `mobile/` — Expo (React Native), Zustand, React Navigation

## Quick start (API)

```bash
cd server
cp .env.example .env
# Set DATABASE_URL, REDIS_URL, JWT_SECRET, PHONE_PEPPER, ENCRYPTION_KEY, MSG91_* , ADMIN_SECRET
npm install
npx prisma migrate dev
npm run dev
```

Local infra (optional):

```bash
docker compose up -d
```

## Quick start (mobile)

```bash
cd mobile
cp .env.example .env
# EXPO_PUBLIC_API_URL=http://localhost:4000
npm install
npx expo start
```

## Production notes

- Host API on Railway/Render; DB on Supabase (PostgreSQL) or managed Postgres.
- Configure MSG91 OTP, Razorpay payouts, and FCM in env vars.
- Contest schedule uses `Asia/Kolkata` (IST).
