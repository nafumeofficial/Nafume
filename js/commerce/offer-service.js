/* ============================================================================
   NAFUME — Offer Service   (Upgrade 9: upsells & bundles)
   ----------------------------------------------------------------------------
   Local-first, framework-free offer engine. Calculates bundle / prepaid / free
   shipping / gifting / sample offers and produces upsell recommendations.

   It does NOT take payment and does NOT call any backend. Prepaid discount is
   shown as checkout-ready messaging (and applied to the LOCAL total) — no real
   payment is confirmed in the browser.

   Cart item shape (from js/launch.js): { id, name, price, qty, image, slug }
   Product catalogue: window.LAUNCH_PRODUCTS (has isBundleEligible, isGiftable,
   isBestSeller, isNewLaunch, family, primaryCollection, collections, …)

   ⚠️  PRICING: buyAny3.bundlePrice is a PRICE CAP. The customer always pays the
   lower of (their 3 items) or the bundle price, so they can never pay MORE than
   normal. At a deep sale price the cap may not produce a discount — that's fine
   and intentional (no confusing/over-charging offers).

   Public API (window.Offers):
     getActiveOffers()
     getCartOfferSummary(cartItems, paymentMethod)
     calculateFreeShippingProgress(cartTotals)
     calculatePrepaidDiscount(cartTotals, paymentMethod)
     isBuyAny3Eligible(cartItems)
     calculateBuyAny3Bundle(cartItems)
     getRecommendedUpsells(cartItems, allProducts)
     getPairingRecommendations(productId)
     getGiftingAddOn()
     applyLocalOfferToCart(offerId)
     removeLocalOfferFromCart(offerId)
     getAppliedLocalOffers()
   ========================================================================== */
(function (global) {
  "use strict";

  var CFG       = global.COMMERCE_CONFIG || {};
  var OFFERS    = CFG.offers || {};
  var SELL      = CFG.sellingPrice || 799;
  var MRP       = CFG.mrp || 1299;
  var SHIP_COST = CFG.shippingCost || 99;
  var FREE_SHIP = (OFFERS.freeShipping && OFFERS.freeShipping.threshold) ||
                  CFG.freeShippingThreshold || 999;
  var CURRENCY  = CFG.currencySymbol || "₹";
  var OFFERS_KEY = "nafume_cart_offers";   // local optional offers (e.g. gift packaging)

  var GIFT_OFFER_ID = "gift-packaging";

  // ── localStorage helpers (never throw) ────────────────────────────────────
  function readJSON(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }
  function money(n) { return CURRENCY + Number(n || 0).toLocaleString("en-IN"); }

  function allProducts() {
    return (global.LAUNCH_PRODUCTS && global.LAUNCH_PRODUCTS.length)
      ? global.LAUNCH_PRODUCTS : [];
  }
  function productById(id) {
    var list = allProducts();
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) return list[i]; }
    return null;
  }

  // ── Active offers ─────────────────────────────────────────────────────────
  function getActiveOffers() {
    var out = {};
    Object.keys(OFFERS).forEach(function (k) {
      if (OFFERS[k] && OFFERS[k].enabled) out[k] = OFFERS[k];
    });
    return out;
  }

  // ── Bundle eligibility (Buy Any 3 × 50ml) ─────────────────────────────────
  // A cart unit is eligible if its product is isBundleEligible (all live SKUs are
  // 50ml). We count UNITS (respecting quantity).
  function eligibleUnits(cartItems) {
    cartItems = cartItems || [];
    var units = [];
    cartItems.forEach(function (it) {
      var p = productById(it.id);
      var ok = p ? (p.isBundleEligible !== false) : true; // default eligible
      if (ok) {
        var price = typeof it.price === "number" ? it.price : SELL;
        for (var i = 0; i < (it.qty || 1); i++) units.push({ id: it.id, price: price });
      }
    });
    return units;
  }

  function isBuyAny3Eligible(cartItems) {
    var cfg = OFFERS.buyAny3;
    if (!cfg || !cfg.enabled) return false;
    return eligibleUnits(cartItems).length >= (cfg.requiredQuantity || 3);
  }

  /* calculateBuyAny3Bundle(cartItems)
     Strategy: apply to GROUPS of 3 eligible units. For each group of 3, the
     customer pays the LOWER of (sum of those 3 unit prices) or the bundle price.
     discount = sum over groups of max(0, groupItemTotal - bundlePrice).         */
  function calculateBuyAny3Bundle(cartItems) {
    var cfg = OFFERS.buyAny3 || {};
    var need = cfg.requiredQuantity || 3;
    var bundlePrice = cfg.bundlePrice || 0;

    var units = eligibleUnits(cartItems);
    // Sort ascending so groups use the cheapest first (conservative, never overcharges).
    units.sort(function (a, b) { return a.price - b.price; });

    var count = units.length;
    var groups = Math.floor(count / need);
    var individualTotal = 0, discount = 0;

    for (var g = 0; g < groups; g++) {
      var groupTotal = 0;
      for (var i = 0; i < need; i++) groupTotal += units[g * need + i].price;
      individualTotal += groupTotal;
      discount += Math.max(0, groupTotal - bundlePrice);
    }

    return {
      enabled:          !!cfg.enabled,
      requiredQuantity: need,
      bundlePrice:      bundlePrice,
      eligibleCount:    count,
      groups:           groups,
      eligible:         count >= need,
      individualTotal:  individualTotal,        // list price of the grouped units
      discount:         discount,               // 0 when sale price already beats the cap
      applied:          discount > 0,
      remainingToUnlock: count >= need ? 0 : (need - count),
      label:            cfg.label || "Buy any 3 × 50ml"
    };
  }

  // ── Free shipping progress ────────────────────────────────────────────────
  function calculateFreeShippingProgress(cartTotals) {
    cartTotals = cartTotals || {};
    var sub = typeof cartTotals.subtotal === "number" ? cartTotals.subtotal : 0;
    var unlocked = sub > 0 && sub >= FREE_SHIP;
    var remaining = unlocked ? 0 : Math.max(0, FREE_SHIP - sub);
    var percent = FREE_SHIP > 0 ? Math.min(100, Math.round((sub / FREE_SHIP) * 100)) : 0;
    return {
      enabled:   !(OFFERS.freeShipping && OFFERS.freeShipping.enabled === false),
      threshold: FREE_SHIP,
      unlocked:  unlocked,
      remaining: remaining,
      percent:   percent,
      label:     unlocked
        ? "You have unlocked free shipping."
        : "Add " + money(remaining) + " more to unlock free shipping."
    };
  }

  // ── Prepaid discount ──────────────────────────────────────────────────────
  function isPrepaid(paymentMethod) {
    return /prepaid|upi|bank|online|card/i.test(String(paymentMethod || ""));
  }

  // Calculated on an amount (pass the post-bundle subtotal for accuracy).
  function calculatePrepaidDiscount(cartTotals, paymentMethod) {
    var cfg = OFFERS.prepaidDiscount;
    var base = (cartTotals && typeof cartTotals.subtotal === "number") ? cartTotals.subtotal : 0;
    if (cartTotals && typeof cartTotals.discountedSubtotal === "number") base = cartTotals.discountedSubtotal;
    if (!cfg || !cfg.enabled || !isPrepaid(paymentMethod) || base <= 0) {
      return { applicable: false, amount: 0, label: cfg ? cfg.label : "" };
    }
    var amount = cfg.type === "flat"
      ? Math.min(base, cfg.value || 0)
      : Math.round(base * ((cfg.value || 0) / 100));
    return { applicable: amount > 0, amount: amount, label: cfg.label, value: cfg.value, type: cfg.type };
  }

  // ── Gifting add-on (optional local offer) ─────────────────────────────────
  function getGiftingAddOn() {
    var cfg = OFFERS.giftingAddOn || {};
    return {
      offerId: GIFT_OFFER_ID,
      enabled: !!cfg.enabled,
      price:   cfg.price || 0,
      label:   cfg.label || "Add premium gift packaging",
      applied: getAppliedLocalOffers().indexOf(GIFT_OFFER_ID) > -1
    };
  }

  function getAppliedLocalOffers() {
    var list = readJSON(OFFERS_KEY, []);
    return Array.isArray(list) ? list : [];
  }
  function applyLocalOfferToCart(offerId) {
    if (!offerId) return getAppliedLocalOffers();
    var list = getAppliedLocalOffers();
    if (list.indexOf(offerId) === -1) list.push(offerId);   // no duplicates
    writeJSON(OFFERS_KEY, list);
    return list;
  }
  function removeLocalOfferFromCart(offerId) {
    var list = getAppliedLocalOffers().filter(function (id) { return id !== offerId; });
    writeJSON(OFFERS_KEY, list);
    return list;
  }

  // ── Try-me sample eligibility (messaging only) ────────────────────────────
  function tryMeSample(subtotal) {
    var cfg = OFFERS.tryMeSample;
    if (!cfg || !cfg.enabled) return { enabled: false, eligible: false };
    return {
      enabled:  true,
      eligible: subtotal >= (cfg.threshold || 999),
      label:    cfg.label || "Free try-me sample on eligible orders",
      // TODO[sample]: connect actual sample product ID / Shopify variant ID later.
      productId: cfg.productId || null
    };
  }

  // ── Master cart offer summary ─────────────────────────────────────────────
  /* getCartOfferSummary(cartItems, paymentMethod)
     Returns a complete, display-ready offer/total breakdown. Safe on empty cart. */
  function getCartOfferSummary(cartItems, paymentMethod) {
    cartItems = cartItems || [];
    var subtotal = 0, itemCount = 0;
    cartItems.forEach(function (it) {
      var price = typeof it.price === "number" ? it.price : SELL;
      subtotal  += price * (it.qty || 1);
      itemCount += (it.qty || 1);
    });

    var appliedOffers = [];

    // Buy Any 3 bundle
    var bundle = calculateBuyAny3Bundle(cartItems);
    var bundleDiscount = bundle.applied ? bundle.discount : 0;
    if (bundleDiscount > 0) {
      appliedOffers.push({ offerId: "buy-any-3", label: bundle.label, amount: -bundleDiscount, type: "bundle" });
    }

    var discountedSubtotal = subtotal - bundleDiscount;

    // Prepaid discount (on the post-bundle amount)
    var prepaid = calculatePrepaidDiscount({ subtotal: subtotal, discountedSubtotal: discountedSubtotal }, paymentMethod);
    var prepaidDiscount = prepaid.applicable ? prepaid.amount : 0;
    if (prepaidDiscount > 0) {
      appliedOffers.push({ offerId: "prepaid", label: prepaid.label, amount: -prepaidDiscount, type: "payment" });
    }

    // Gifting add-on
    var gift = getGiftingAddOn();
    var giftingAddOn = (gift.enabled && gift.applied) ? gift.price : 0;
    if (giftingAddOn > 0) {
      appliedOffers.push({ offerId: gift.offerId, label: gift.label, amount: giftingAddOn, type: "addon" });
    }

    // Shipping (threshold measured on subtotal — generous & predictable)
    var freeShippingUnlocked = subtotal > 0 && subtotal >= FREE_SHIP;
    var shipping = (subtotal === 0) ? 0 : (freeShippingUnlocked ? 0 : SHIP_COST);

    var total = Math.max(0, discountedSubtotal - prepaidDiscount + shipping + giftingAddOn);

    return {
      subtotal:              subtotal,
      productDiscount:       0,                       // reserved (per-line discounts)
      bundleDiscount:        bundleDiscount,
      prepaidDiscount:       prepaidDiscount,
      giftingAddOn:          giftingAddOn,
      shipping:              shipping,
      total:                 total,
      itemCount:             itemCount,
      freeShippingUnlocked:  freeShippingUnlocked,
      amountForFreeShipping: freeShippingUnlocked ? 0 : Math.max(0, FREE_SHIP - subtotal),
      appliedOffers:         appliedOffers,
      bundle:                bundle,
      prepaid:               prepaid,
      tryMeSample:           tryMeSample(subtotal),
      freeShippingProgress:  calculateFreeShippingProgress({ subtotal: subtotal })
    };
  }

  // ── Recommendations ───────────────────────────────────────────────────────
  function isFresh(p)  { return p && /fresh|aquatic|citrus/i.test(p.family || ""); }
  function isHeavy(p)  { return p && /oud|woody|spicy|gourmand|oriental/i.test(p.family || ""); }

  function reasonForUpsell(candidate, cartProducts) {
    var cartHasHeavy = cartProducts.some(isHeavy);
    var cartHasFresh = cartProducts.some(isFresh);
    if (isFresh(candidate) && cartHasHeavy) return "Fresh daily-wear option";
    if (isHeavy(candidate) && cartHasFresh) return "Pairs well with your fresh pick";
    if (candidate.isBestSeller)             return "Popular customer favourite";
    if (candidate.isGiftable)               return "Popular gifting choice";
    return "Complete your fragrance wardrobe";
  }

  /* getRecommendedUpsells(cartItems, allProductsList) -> [{ product, reason }] (max 4) */
  function getRecommendedUpsells(cartItems, allProductsList) {
    cartItems = cartItems || [];
    var pool = (allProductsList && allProductsList.length) ? allProductsList : allProducts();
    var inCart = {};
    cartItems.forEach(function (it) { inCart[it.id] = true; });

    var cartProducts = cartItems.map(function (it) { return productById(it.id); }).filter(Boolean);
    var candidates = pool.filter(function (p) { return p && !inCart[p.id]; });

    // Rank: bestsellers first, then giftable, then the rest — for a useful mix.
    candidates.sort(function (a, b) {
      var sa = (a.isBestSeller ? 2 : 0) + (a.isGiftable ? 1 : 0);
      var sb = (b.isBestSeller ? 2 : 0) + (b.isGiftable ? 1 : 0);
      return sb - sa;
    });

    return candidates.slice(0, 4).map(function (p) {
      return { product: p, reason: reasonForUpsell(p, cartProducts) };
    });
  }

  /* getPairingRecommendations(productId) -> [{ product, reason }] (max 3)
     Used on product pages: a complementary scent, a same-collection pick, and a
     best-seller fallback. */
  function getPairingRecommendations(productId) {
    var p = productById(productId);
    var pool = allProducts().filter(function (x) { return x.id !== productId; });
    if (!p || !pool.length) return [];

    var picked = {};
    var out = [];
    function take(product, reason) {
      if (product && !picked[product.id]) { picked[product.id] = true; out.push({ product: product, reason: reason }); }
    }

    // 1) Complementary scent family
    var complementary = isHeavy(p)
      ? pool.find(isFresh)
      : pool.find(isHeavy);
    take(complementary, "Pairs well with " + p.name);

    // 2) Same primary collection ("make it a bundle")
    var sameCol = pool.find(function (x) {
      return x.primaryCollection && p.primaryCollection && x.primaryCollection === p.primaryCollection && !picked[x.id];
    });
    take(sameCol, "Make it a bundle");

    // 3) Best seller fallback ("also loved by customers")
    var bestSeller = pool.find(function (x) { return x.isBestSeller && !picked[x.id]; });
    take(bestSeller, "Also loved by customers");

    // Top up to 3 with anything remaining.
    for (var i = 0; i < pool.length && out.length < 3; i++) take(pool[i], "You may also like");

    return out.slice(0, 3);
  }

  // ── Expose ────────────────────────────────────────────────────────────────
  global.Offers = {
    GIFT_OFFER_ID:               GIFT_OFFER_ID,
    getActiveOffers:             getActiveOffers,
    getCartOfferSummary:         getCartOfferSummary,
    calculateFreeShippingProgress: calculateFreeShippingProgress,
    calculatePrepaidDiscount:    calculatePrepaidDiscount,
    isBuyAny3Eligible:           isBuyAny3Eligible,
    calculateBuyAny3Bundle:      calculateBuyAny3Bundle,
    getRecommendedUpsells:       getRecommendedUpsells,
    getPairingRecommendations:   getPairingRecommendations,
    getGiftingAddOn:             getGiftingAddOn,
    getAppliedLocalOffers:       getAppliedLocalOffers,
    applyLocalOfferToCart:       applyLocalOfferToCart,
    removeLocalOfferFromCart:    removeLocalOfferFromCart
  };
})(window);
