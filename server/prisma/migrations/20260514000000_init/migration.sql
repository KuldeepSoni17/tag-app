-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ContestStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone_hash" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "banned_until" TIMESTAMP(3),
    "last_ip" TEXT,
    "registration_ip" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profile_answers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" INTEGER NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_profile_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contests" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "ContestStatus" NOT NULL DEFAULT 'OPEN',
    "criteria_encrypted" TEXT,
    "criteria_iv" TEXT,
    "criteria_auth_tag" TEXT,
    "criteria_revealed" TEXT,
    "winner_id" TEXT,
    "prize_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "contests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chains" (
    "id" TEXT NOT NULL,
    "contest_id" TEXT NOT NULL,
    "head_user_id" TEXT NOT NULL,
    "tail_user_id" TEXT NOT NULL,
    "length" INTEGER NOT NULL DEFAULT 1,
    "is_eligible" BOOLEAN NOT NULL DEFAULT true,
    "fraud_flag" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chain_nodes" (
    "id" TEXT NOT NULL,
    "chain_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tagged_by_user_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_ip" TEXT,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chain_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_flags" (
    "id" TEXT NOT NULL,
    "chain_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_sessions" (
    "id" TEXT NOT NULL,
    "phone_hash" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,

    CONSTRAINT "otp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prize_payouts" (
    "id" TEXT NOT NULL,
    "contest_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "razorpay_id" TEXT,
    "status" TEXT NOT NULL,
    "raw_response" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prize_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_hash_key" ON "users"("phone_hash");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_answers_user_id_question_id_key" ON "user_profile_answers"("user_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "contests_date_key" ON "contests"("date");

-- CreateIndex
CREATE INDEX "chains_contest_id_idx" ON "chains"("contest_id");

-- CreateIndex
CREATE INDEX "chain_nodes_user_id_idx" ON "chain_nodes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "chain_nodes_chain_id_user_id_key" ON "chain_nodes"("chain_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "chain_nodes_chain_id_position_key" ON "chain_nodes"("chain_id", "position");

-- CreateIndex
CREATE INDEX "fraud_flags_chain_id_reviewed_idx" ON "fraud_flags"("chain_id", "reviewed");

-- CreateIndex
CREATE INDEX "otp_sessions_phone_hash_idx" ON "otp_sessions"("phone_hash");

-- CreateIndex
CREATE UNIQUE INDEX "prize_payouts_contest_id_key" ON "prize_payouts"("contest_id");

-- AddForeignKey
ALTER TABLE "user_profile_answers" ADD CONSTRAINT "user_profile_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contests" ADD CONSTRAINT "contests_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chains" ADD CONSTRAINT "chains_contest_id_fkey" FOREIGN KEY ("contest_id") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chains" ADD CONSTRAINT "chains_head_user_id_fkey" FOREIGN KEY ("head_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chains" ADD CONSTRAINT "chains_tail_user_id_fkey" FOREIGN KEY ("tail_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chain_nodes" ADD CONSTRAINT "chain_nodes_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "chains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chain_nodes" ADD CONSTRAINT "chain_nodes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_flags" ADD CONSTRAINT "fraud_flags_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "chains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_sessions" ADD CONSTRAINT "otp_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prize_payouts" ADD CONSTRAINT "prize_payouts_contest_id_fkey" FOREIGN KEY ("contest_id") REFERENCES "contests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prize_payouts" ADD CONSTRAINT "prize_payouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

