/*
 * POST /api/razorpay/create-order  —  Razorpay Order creation  (Vercel Serverless Function)
 * --------------------------------------------------------------------------------------
 * Runs server-side only. RAZORPAY_KEY_SECRET is NEVER exposed to the browser — only the
 * publishable key_id is returned in the response (safe to use in Razorpay Checkout JS).
 *
 * Security model — EXACT server-side pricing (no tolerance band):
 *   - The frontend sends the cart it wants to pay for: { items: [{ id, qty }, ...],
 *     giftingAddOn: boolean, amount }.
 *   - Every item id is checked against ALLOWED_PRODUCTS (server-side price list) — unknown
 *     SKUs are rejected outright, so a tampered/fabricated product id can never be priced.
 *   - The server independently recomputes the FINAL payable amount from trusted data only:
 *       subtotal        = Σ(ALLOWED_PRODUCTS[id] price × qty)   — client-sent prices ignored
 *       bundle discount = "Buy any 3 × 50ml at ₹2199" price cap, replicated exactly from
 *                          js/commerce/offer-service.js calculateBuyAny3Bundle()
 *       prepaid discount = OFFERS.prepaidDiscount %, ALWAYS applied for this endpoint since
 *                          every Razorpay payment is by definition an online/prepaid payment
 *                          (mirrors js/commerce/offer-service.js calculatePrepaidDiscount())
 *       gifting add-on   = fixed ₹99 ONLY if the client says the shopper opted in — the
 *                          PRICE itself is never taken from the client, only the boolean intent
 *       shipping         = free above ₹999 subtotal, else ₹99 flat
 *     This mirrors js/commerce/offer-service.js getCartOfferSummary() exactly. Both files
 *     read the same source values (js/commerce/config.js OFFERS) — if pricing/offers ever
 *     change there, update OFFER_RULES below to match.
 *   - The client-sent `amount` is NEVER used to charge the customer — it is only compared
 *     against the server's own calculated total. Any mismatch (even ₹1) is rejected, so a
 *     frontend/backend drift bug fails safely instead of silently charging the wrong amount.
 *
 * Setup (one-time):
 *   1. Sign up / log in at razorpay.com → Dashboard → Settings → API Keys.
 *   2. Generate Test Mode keys first (Key Id starts with rzp_test_) and test the full flow.
 *   3. Add to Vercel → Project → Settings → Environment Variables (Production + Preview):
 *        RAZORPAY_KEY_ID       — publishable key id (rzp_test_... or rzp_live_...)
 *        RAZORPAY_KEY_SECRET   — secret key (NEVER put this in any frontend file)
 *   4. Trigger a new Vercel deployment after adding/changing env vars.
 *   5. Once testing passes, replace the env var VALUES with Live Mode keys in the Vercel
 *      dashboard only — no code change needed to go live.
 *
 * Env vars required (Vercel Dashboard — NOT in any frontend file):
 *   RAZORPAY_KEY_ID
 *   RAZORPAY_KEY_SECRET
 */
"use strict";

const KEY_ID     = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// Server-side price list — mirrors js/launch.js LAUNCH_PRODUCTS ids.
// Keep in sync manually if the product catalogue changes.
const ALLOWED_PRODUCTS = {
  "seduction":       799,
  "dark-oud":        799,
  "red-spirit":      799,
  "aqua-manthan":    799,
  "all-day-misfit":  799
};

// Offer rules — mirrors js/commerce/config.js COMMERCE_CONFIG.offers exactly.
// Keep in sync manually if offers change there.
const OFFER_RULES = {
  freeShippingThreshold: 999,
  shippingCost:           99,
  prepaidDiscount: {
    enabled: true,
    type:    "percentage",   // "percentage" | "flat"
    value:   5                // 5% off
  },
  buyAny3: {
    enabled:          true,
    requiredQuantity: 3,
    bundlePrice:      2199
  },
  giftingAddOn: {
    enabled: true,
    price:   99
  }
};

const MAX_QTY_PER_ITEM  = 20;
const MAX_TOTAL_ITEMS   = 50;

/* validateAndPriceItems(items)
   Validates product ids + quantities against ALLOWED_PRODUCTS only.
   Returns { error, message } on failure, or { subtotal, totalQty } on success. */
function validateAndPriceItems(items) {
  var subtotal = 0;
  var totalQty = 0;

  for (var i = 0; i < items.length; i++) {
    var it  = items[i] || {};
    var id  = String(it.id || "");
    var qty = parseInt(it.qty, 10);

    if (!ALLOWED_PRODUCTS.hasOwnProperty(id)) {
      return { error: "invalid_product", message: "One or more items in your cart are not recognised. Please refresh and try again." };
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) {
      return { error: "invalid_quantity", message: "Invalid item quantity." };
    }
    subtotal += ALLOWED_PRODUCTS[id] * qty;
    totalQty += qty;
  }

  if (totalQty > MAX_TOTAL_ITEMS) {
    return { error: "too_many_items", message: "Order quantity is too large. Please contact support for bulk orders." };
  }

  return { subtotal: subtotal, totalQty: totalQty };
}

/* calculateExactTotal(subtotal, totalQty, giftingAddOnRequested)
   Exact replica of js/commerce/offer-service.js getCartOfferSummary() math, using ONLY
   server-trusted values. All inputs here are integers (₹799 unit price, fixed offer
   values), so plain integer arithmetic is exact — no floating-point rounding risk. */
function calculateExactTotal(subtotal, totalQty, giftingAddOnRequested) {
  // ── Buy Any 3 × 50ml bundle (price cap per group of 3 units) ──
  // All 5 NAFUME products are bundle-eligible and identically priced, so unlike
  // offer-service.js we don't need per-unit sorting — every group of 3 costs the same.
  var bundleDiscount = 0;
  var bundleCfg = OFFER_RULES.buyAny3;
  if (bundleCfg.enabled) {
    var groups = Math.floor(totalQty / bundleCfg.requiredQuantity);
    if (groups > 0) {
      var unitPrice  = 799; // flat NAFUME selling price — see ALLOWED_PRODUCTS
      var groupTotal = unitPrice * bundleCfg.requiredQuantity;
      var perGroupDiscount = Math.max(0, groupTotal - bundleCfg.bundlePrice);
      bundleDiscount = groups * perGroupDiscount;
    }
  }

  var discountedSubtotal = subtotal - bundleDiscount;

  // ── Prepaid discount — ALWAYS applies here: every Razorpay payment is online/prepaid ──
  var prepaidDiscount = 0;
  var prepaidCfg = OFFER_RULES.prepaidDiscount;
  if (prepaidCfg.enabled && discountedSubtotal > 0) {
    prepaidDiscount = prepaidCfg.type === "flat"
      ? Math.min(discountedSubtotal, prepaidCfg.value)
      : Math.round(discountedSubtotal * (prepaidCfg.value / 100));
  }

  // ── Gifting add-on — boolean intent only; price is always server-defined ──
  var giftingAddOn = 0;
  var giftCfg = OFFER_RULES.giftingAddOn;
  if (giftCfg.enabled && giftingAddOnRequested === true) {
    giftingAddOn = giftCfg.price;
  }

  // ── Shipping — threshold measured on the RAW subtotal, matching offer-service.js ──
  var shipping = subtotal === 0
    ? 0
    : (subtotal >= OFFER_RULES.freeShippingThreshold ? 0 : OFFER_RULES.shippingCost);

  var total = Math.max(0, discountedSubtotal - prepaidDiscount + shipping + giftingAddOn);

  return {
    subtotal:         subtotal,
    bundleDiscount:   bundleDiscount,
    prepaidDiscount:  prepaidDiscount,
    giftingAddOn:     giftingAddOn,
    shipping:         shipping,
    total:            total
  };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!KEY_ID || !KEY_SECRET) {
    return res.status(500).json({
      error: "server_misconfigured",
      message: "Online payment is not configured yet. Please use WhatsApp to place your order."
    });
  }

  const body  = (typeof req.body === "string") ? JSON.parse(req.body) : (req.body || {});
  const items = Array.isArray(body.items) ? body.items : [];
  const giftingAddOnRequested = body.giftingAddOn === true;
  const clientAmount = Number(body.amount);
  // Optional: use the frontend's own order id as the Razorpay receipt, so a
  // payment in the Razorpay Dashboard can be traced back to the local order.
  // Razorpay's receipt field is opaque (max 40 chars) — no injection risk,
  // but we still sanitise to a safe character set and fall back to a random
  // receipt if it's missing or malformed.
  const clientOrderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const validOrderId = /^[A-Za-z0-9\-_]{1,40}$/.test(clientOrderId) ? clientOrderId : null;

  if (items.length === 0) {
    return res.status(400).json({ error: "empty_cart", message: "Your cart is empty." });
  }
  if (!Number.isFinite(clientAmount) || clientAmount <= 0) {
    return res.status(400).json({ error: "invalid_amount", message: "Invalid order amount." });
  }

  const priced = validateAndPriceItems(items);
  if (priced.error) {
    return res.status(400).json({ error: priced.error, message: priced.message });
  }

  const calc = calculateExactTotal(priced.subtotal, priced.totalQty, giftingAddOnRequested);

  if (clientAmount !== calc.total) {
    // Never log the actual attempted amount/items in detail — just flag the mismatch.
    console.warn("[razorpay/create-order] amount mismatch — expected server total, client sent a different value");
    return res.status(400).json({
      error: "amount_mismatch",
      message: "Order amount could not be verified. Please refresh your cart and try again."
    });
  }

  const amountPaise = calc.total * 100;
  const receipt = validOrderId || ("NF-" + Date.now().toString().slice(-8) + "-" + Math.floor(100 + Math.random() * 900));

  try {
    const ctrl  = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, 10000);

    const auth = Buffer.from(KEY_ID + ":" + KEY_SECRET).toString("base64");
    const resp = await fetch("https://api.razorpay.com/v1/orders", {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": "Basic " + auth
      },
      body: JSON.stringify({
        amount:   amountPaise,
        currency: "INR",
        receipt:  receipt,
        payment_capture: 1,
        notes: validOrderId ? { nafumeOrderId: validOrderId } : undefined
      }),
      signal: ctrl.signal
    });
    clearTimeout(timer);

    if (!resp.ok) {
      var errBody = await resp.text().catch(function () { return ""; });
      console.error("[razorpay/create-order] Razorpay API error", resp.status);
      return res.status(502).json({
        error: "razorpay_error",
        message: "Could not start payment right now. Please try again or use WhatsApp."
      });
    }

    const order = await resp.json();

    return res.status(200).json({
      order_id: order.id,
      amount:   order.amount,
      currency: order.currency,
      key_id:   KEY_ID
    });

  } catch (err) {
    console.error("[razorpay/create-order] request failed:", err.message);
    return res.status(500).json({
      error: "server_error",
      message: "Payment service is temporarily unavailable. Please try again or use WhatsApp."
    });
  }
};
