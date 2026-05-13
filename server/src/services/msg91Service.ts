import type { Env } from "../lib/env.js";

/**
 * MSG91 OTP send / verify.
 * Docs: https://control.msg91.com/app/
 * Uses OTP API v5 where available; falls back to documented REST patterns.
 */
export async function sendOtpMsg91(env: Env, mobile: string, otp: string): Promise<void> {
  if (!env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID) {
    if (env.DEV_STATIC_OTP) {
      console.info(`[msg91] skipped send (dev); OTP for ${mobile} would be ${otp}`);
      return;
    }
    throw new Error("MSG91 is not configured");
  }

  const body = {
    template_id: env.MSG91_TEMPLATE_ID,
    short_url: "0",
    recipients: [
      {
        mobiles: mobile.replace(/^\+/, ""),
        var: otp,
      },
    ],
  };

  const res = await fetch("https://control.msg91.com/api/v5/flow", {
    method: "POST",
    headers: {
      accept: "application/json",
      authkey: env.MSG91_AUTH_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MSG91 send failed: ${res.status} ${text}`);
  }
}
