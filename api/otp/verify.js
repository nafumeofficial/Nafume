/*
 * POST /api/otp/verify  —  MSG91 VerifyOTP proxy  (Vercel Serverless Function)
 * --------------------------------------------------------------------------
 * This runs server-side only. MSG91_AUTH_KEY is NEVER exposed to the browser.
 * Raw MSG91 error messages are never forwarded to the client.
 *
 * Env vars required (Vercel Dashboard — NOT in any frontend file):
 *   MSG91_AUTH_KEY           — authkey from msg91.com
 *   OTP_MAX_VERIFY_ATTEMPTS  — max wrong-OTP attempts per session (default 5;
 *                              enforced on the client via sessionStorage — a
 *                              proper server-side counter needs Vercel KV)
 */
"use strict";

const AUTH_KEY = process.env.MSG91_AUTH_KEY;

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!AUTH_KEY) {
    return res.status(500).json({
      error: "server_misconfigured",
      message: "OTP service is not configured. Please contact support."
    });
  }

  const body   = (typeof req.body === "string") ? JSON.parse(req.body) : (req.body || {});
  const digits = String(body.phone || "").replace(/\D/g, "");
  const otp    = String(body.otp   || "").replace(/\D/g, "");

  if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
    return res.status(400).json({ error: "invalid_phone", message: "Invalid phone number." });
  }
  if (otp.length !== 6) {
    return res.status(400).json({
      error: "invalid_otp_format",
      message: "Please enter the 6-digit OTP."
    });
  }

  const mobile    = "91" + digits;
  const verifyUrl = "https://control.msg91.com/api/v5/otp/verify" +
                    "?mobile=" + encodeURIComponent(mobile) +
                    "&otp="    + encodeURIComponent(otp);

  let result;
  try {
    const resp = await fetch(verifyUrl, {
      method:  "GET",
      headers: { "authkey": AUTH_KEY }
    });
    result = await resp.json();
  } catch (_) {
    return res.status(500).json({
      error: "server_error",
      message: "Service temporarily unavailable. Please try again."
    });
  }

  if (result.type === "success") {
    return res.status(200).json({ success: true });
  }

  const msg = String(result.message || "").toLowerCase();

  if (msg.includes("not matched") || msg.includes("wrong otp") || msg.includes("invalid otp")) {
    return res.status(422).json({
      error: "invalid_otp",
      message: "Incorrect OTP. Please check and try again."
    });
  }
  if (msg.includes("expired") || msg.includes("otp not found") || msg.includes("request not found")) {
    return res.status(422).json({
      error: "otp_expired",
      message: "OTP has expired. Please request a new one."
    });
  }

  return res.status(422).json({
    error: "verify_failed",
    message: "OTP verification failed. Please try again."
  });
};
