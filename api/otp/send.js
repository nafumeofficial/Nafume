/*
 * POST /api/otp/send  —  MSG91 SendOTP proxy  (Vercel Serverless Function)
 * --------------------------------------------------------------------------
 * This runs server-side only. MSG91_AUTH_KEY is NEVER exposed to the browser.
 *
 * DLT / MSG91 Setup (India mandatory):
 *   1. Register on msg91.com and get your authkey.
 *   2. Create an OTP template containing ##OTP## and get it DLT-approved.
 *      Suggested template text:
 *        "{#var#} is your NAFUME verification code. It is valid for 5 minutes.
 *         Do not share it with anyone."
 *   3. Note the DLT-approved Template ID and Sender ID from msg91.com dashboard.
 *   4. Add the values to Vercel → Project → Settings → Environment Variables
 *      for both Production and Preview environments.
 *   5. Trigger a new Vercel deployment after adding env vars.
 *
 * Env vars required (Vercel Dashboard — NOT in any frontend file):
 *   MSG91_AUTH_KEY           — authkey from msg91.com
 *   MSG91_TEMPLATE_ID        — DLT-approved template ID
 *   MSG91_SENDER_ID          — approved sender/header (e.g. NAFUME)
 *   OTP_EXPIRY_SECONDS       — validity window (default 300 = 5 min)
 *   OTP_RESEND_COOLDOWN_SECONDS — UI cooldown hint returned to frontend (default 30)
 */
"use strict";

const AUTH_KEY    = process.env.MSG91_AUTH_KEY;
const TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID;
const SENDER_ID   = process.env.MSG91_SENDER_ID   || "NAFUME";
const EXPIRY_SECS = parseInt(process.env.OTP_EXPIRY_SECONDS || "300", 10);
const COOLDOWN    = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || "30", 10);

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!AUTH_KEY || !TEMPLATE_ID) {
    return res.status(500).json({
      error: "server_misconfigured",
      message: "OTP service is not configured. Please contact support."
    });
  }

  const body   = (typeof req.body === "string") ? JSON.parse(req.body) : (req.body || {});
  const digits = String(body.phone || "").replace(/\D/g, "");

  if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
    return res.status(400).json({
      error: "invalid_phone",
      message: "Please enter a valid 10-digit Indian mobile number."
    });
  }

  const mobile = "91" + digits;

  let result;
  try {
    const resp = await fetch("https://control.msg91.com/api/v5/otp", {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "authkey":      AUTH_KEY
      },
      body: JSON.stringify({
        template_id: TEMPLATE_ID,
        sender:      SENDER_ID,
        mobile:      mobile,
        otp_length:  6,
        otp_expiry:  Math.ceil(EXPIRY_SECS / 60)
      })
    });
    result = await resp.json();
  } catch (_) {
    return res.status(500).json({
      error: "server_error",
      message: "Service temporarily unavailable. Please try again."
    });
  }

  if (result.type === "success") {
    return res.status(200).json({ success: true, cooldownSeconds: COOLDOWN });
  }

  const msg = String(result.message || "").toLowerCase();

  if (msg.includes("already have a valid otp")) {
    return res.status(429).json({
      error: "otp_already_sent",
      message: "An OTP was recently sent. Please wait before requesting another.",
      cooldownSeconds: COOLDOWN
    });
  }

  return res.status(422).json({
    error: "otp_send_failed",
    message: "Could not send OTP. Please try again."
  });
};
