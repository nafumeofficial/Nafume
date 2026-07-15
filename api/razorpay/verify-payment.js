/*
 * POST /api/razorpay/verify-payment  —  Razorpay signature verification (Vercel Serverless Function)
 * ----------------------------------------------------------------------------------------------------
 * Runs server-side only. Verifies that a payment reported as successful by the Razorpay
 * Checkout JS callback is authentic, using RAZORPAY_KEY_SECRET (never sent to the browser).
 *
 * Razorpay's Standard Checkout signature scheme:
 *   expected_signature = HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, KEY_SECRET)
 *   Payment is genuine only if expected_signature === razorpay_signature (constant-time compare).
 *
 * This app stores orders in the customer's OWN browser (localStorage), not a shared server
 * database — there is no server-side order record for this endpoint to update. It therefore
 * returns { success: true/false } only; the frontend (js/launch.js) is responsible for
 * marking the matching local order as paid ONLY after receiving success:true from here.
 * Never mark an order "paid" from the Checkout JS handler callback alone — that callback
 * fires client-side and is not proof of a genuine payment on its own.
 *
 * Env vars required (Vercel Dashboard — NOT in any frontend file):
 *   RAZORPAY_KEY_SECRET
 */
"use strict";

const crypto = require("crypto");

const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!KEY_SECRET) {
    return res.status(500).json({
      success: false,
      error: "server_misconfigured",
      message: "Payment verification is not configured. Please contact support with your payment ID."
    });
  }

  const body = (typeof req.body === "string") ? JSON.parse(req.body) : (req.body || {});
  const orderId   = String(body.razorpay_order_id   || "").trim();
  const paymentId = String(body.razorpay_payment_id || "").trim();
  const signature = String(body.razorpay_signature  || "").trim();

  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({
      success: false,
      error: "missing_fields",
      message: "Payment details are incomplete."
    });
  }

  try {
    const expected = crypto
      .createHmac("sha256", KEY_SECRET)
      .update(orderId + "|" + paymentId)
      .digest("hex");

    const expectedBuf = Buffer.from(expected, "utf8");
    const givenBuf    = Buffer.from(signature, "utf8");

    const isValid = expectedBuf.length === givenBuf.length &&
      crypto.timingSafeEqual(expectedBuf, givenBuf);

    if (!isValid) {
      console.warn("[razorpay/verify-payment] signature mismatch");
      return res.status(400).json({
        success: false,
        error: "invalid_signature",
        message: "Payment could not be verified. If money was deducted, please contact support with your payment ID."
      });
    }

    return res.status(200).json({
      success: true,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId
    });

  } catch (err) {
    console.error("[razorpay/verify-payment] verification failed:", err.message);
    return res.status(500).json({
      success: false,
      error: "server_error",
      message: "Payment verification failed. Please contact support with your payment ID."
    });
  }
};
