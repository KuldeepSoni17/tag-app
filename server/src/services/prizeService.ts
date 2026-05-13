import type { Env } from "../lib/env.js";

/** Razorpay Payouts API — stubbed until keys are present (records intent either way). */
export async function disbursePrize(env: Env, input: { userId: string; amountPaise: number; contestId: string }): Promise<{
  status: string;
  razorpayId?: string;
  raw?: string;
}> {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return { status: "skipped_no_keys", raw: JSON.stringify({ note: "configure Razorpay for live payouts" }) };
  }

  // Minimal placeholder: real flow needs fund_account + contact creation per user.
  return {
    status: "pending_manual_integration",
    raw: JSON.stringify({ amountPaise: input.amountPaise, userId: input.userId, contestId: input.contestId }),
  };
}
