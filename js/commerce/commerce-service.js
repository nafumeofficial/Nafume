/* ============================================================================
   NAFUME — Commerce Service Layer   (Upgrade 1: commerce foundation)
   ----------------------------------------------------------------------------
   A small, framework-free API over product data, the cart, and local orders.
   Goal: give pages ONE place to read/write commerce data instead of poking
   localStorage from everywhere.

   Coexistence with js/launch.js (the live store):
     - Shares the SAME cart key ("nafumeLaunchCart") and item shape.
     - When launch.js is present on the page, cart WRITES delegate to its
       functions so the live cart UI updates instantly. Otherwise the service
       writes localStorage directly in the same shape.

   Public API  (window.Commerce):
     getProducts()                          -> [product]
     getProductById(id)                     -> product | null
     getCart()                              -> [cartItem]
     addToCart(productId, qty, variantId)   -> [cartItem]
     updateCartItem(productId, qty)         -> [cartItem]
     removeCartItem(productId)              -> [cartItem]
     clearCart()                            -> []
     getCartTotals()                        -> totals
     createLocalOrder(orderPayload)         -> order
     getOrderById(orderId)                  -> order | null
     getCustomerOrders(phoneOrEmail)        -> [order]
   ========================================================================== */
(function (global) {
  "use strict";

  var CFG        = global.COMMERCE_CONFIG || {};
  var CART_KEY   = (CFG.storageKeys && CFG.storageKeys.cart)   || "nafumeLaunchCart";
  var ORDERS_KEY = (CFG.storageKeys && CFG.storageKeys.orders) || "nafume_orders_v2";
  var SELL       = CFG.sellingPrice || 799;
  var MRP        = CFG.mrp || 1299;
  var FREE_SHIP  = CFG.freeShippingThreshold || 999;
  var SHIP_COST  = CFG.shippingCost || 99;

  // ── localStorage helpers (never throw) ──────────────────────────────────
  function readJSON(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }
  function digits(s)  { return String(s == null ? "" : s).replace(/\D/g, ""); }
  function last10(s)  { var d = digits(s); return d.length > 10 ? d.slice(-10) : d; }

  // ── Products ─────────────────────────────────────────────────────────────
  // Source of truth is window.LAUNCH_PRODUCTS (js/launch.js). We normalize it
  // into a clean, backend-ready shape WITHOUT mutating the original objects.
  function rawProducts() {
    return (global.LAUNCH_PRODUCTS && global.LAUNCH_PRODUCTS.length)
      ? global.LAUNCH_PRODUCTS : [];
  }

  function normalizeProduct(p) {
    if (!p) return null;
    var discountPercent = MRP > 0 ? Math.round(((MRP - SELL) / MRP) * 100) : 0;
    return {
      id:             p.id,
      slug:           p.slug || (p.id + ""),
      name:           p.name,
      subtitle:       p.edp || "Eau De Parfum",
      gender:         p.gender || "Unisex",
      category:       "Perfume",
      collection:     "New Launch",
      size:           "50ml",
      concentration:  p.edp || "Eau De Parfum",
      price:          SELL,
      mrp:            MRP,
      discountPercent: discountPercent,
      images:         (p.gallery && p.gallery.length) ? p.gallery.slice() : [p.image],
      notesTop:       p.topNotes   || "",
      notesHeart:     p.heartNotes || "",
      notesBase:      p.baseNotes  || "",
      moodTags:       (p.feelings  || []).slice(),
      occasionTags:   (p.occasions || []).slice(),
      longevity:      p.longevity || "Long Lasting",
      sillage:        p.sillage   || "Moderate",
      stockStatus:    "in_stock",
      inventoryQuantity: 999,
      isBestSeller:   !!p.isBestSeller,
      isNewLaunch:    true,
      isFeatured:     !!p.isFeatured,
      // ── Shopify mapping (Upgrade 2) — read through from the raw product ──
      // These stay null until real IDs are pasted into js/launch.js.
      shopifyVariantId: p.shopifyVariantId || null,   // Storefront variant / merchandise GID
      shopifyProductId: p.shopifyProductId || null    // Storefront product GID
    };
  }

  function getProducts() {
    return rawProducts().map(normalizeProduct);
  }
  function getProductById(id) {
    var list = rawProducts();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return normalizeProduct(list[i]);
    }
    return null;
  }

  // ── Cart ─────────────────────────────────────────────────────────────────
  // Persisted in launch.js's format (keys: id,name,price,qty,image,slug) under
  // CART_KEY. We expose a normalized read view but keep persistence compatible.
  function rawCart() { return readJSON(CART_KEY, []) || []; }
  function hasLaunch() { return typeof global.launchAddToCart === "function"; }

  function normalizeCartItem(it) {
    var prod = getProductById(it.id);
    return {
      productId: it.id,
      slug:      it.slug  || (prod ? prod.slug : ""),
      name:      it.name  || (prod ? prod.name : ""),
      image:     it.image || (prod ? prod.images[0] : ""),
      price:     typeof it.price === "number" ? it.price : SELL,
      mrp:       MRP,
      quantity:  it.qty || it.quantity || 1,
      size:      it.size || "50ml",
      variantId: it.variantId || null,   // TODO[shopify]: Storefront variant GID
      addedAt:   it.addedAt || null
    };
  }
  function getCart() { return rawCart().map(normalizeCartItem); }

  function addToCart(productId, quantity, variantId) {
    quantity = Math.max(1, parseInt(quantity, 10) || 1);
    // Prefer the live store's own function so its cart UI updates in sync.
    if (hasLaunch()) { global.launchAddToCart(productId, quantity); return getCart(); }
    var cart = rawCart();
    var prod = getProductById(productId);
    if (!prod) return getCart();
    var idx = -1;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === productId) { idx = i; break; }
    }
    if (idx > -1) {
      cart[idx].qty = (cart[idx].qty || 0) + quantity;
    } else {
      cart.push({
        id: productId, name: prod.name, price: prod.price, qty: quantity,
        image: prod.images[0], slug: prod.slug,
        variantId: variantId || null, addedAt: new Date().toISOString()
      });
    }
    writeJSON(CART_KEY, cart);
    return getCart();
  }

  function updateCartItem(productId, quantity) {
    quantity = parseInt(quantity, 10) || 0;
    if (quantity <= 0) return removeCartItem(productId);
    if (hasLaunch() && typeof global.launchChangeQty === "function") {
      var current = 0, c = rawCart();
      for (var i = 0; i < c.length; i++) {
        if (c[i].id === productId) { current = c[i].qty || 0; break; }
      }
      var delta = quantity - current;
      if (delta !== 0) global.launchChangeQty(productId, delta);
      return getCart();
    }
    var cart = rawCart();
    for (var j = 0; j < cart.length; j++) {
      if (cart[j].id === productId) cart[j].qty = quantity;
    }
    writeJSON(CART_KEY, cart);
    return getCart();
  }

  function removeCartItem(productId) {
    if (hasLaunch() && typeof global.launchRemove === "function") {
      global.launchRemove(productId); return getCart();
    }
    var cart = rawCart().filter(function (it) { return it.id !== productId; });
    writeJSON(CART_KEY, cart);
    return getCart();
  }

  function clearCart() {
    writeJSON(CART_KEY, []);
    if (typeof global.renderCartUI === "function") {
      try { global.renderCartUI(); } catch (e) {}
    }
    return [];
  }

  /* getCartTotals(paymentMethod)
     Backward compatible: the original fields (subtotal, discount, shipping, total,
     itemCount, freeShippingUnlocked, amountForFreeShipping) are unchanged. When
     offer-service.js (window.Offers) is present, EXTRA fields are layered on:
       productDiscount, bundleDiscount, prepaidDiscount, giftingAddOn, appliedOffers.
     If Offers is unavailable, the extras default to safe zero values and `total`
     stays exactly as before (subtotal + shipping). paymentMethod is optional. */
  function getCartTotals(paymentMethod) {
    var items = getCart();
    var subtotal = 0, mrpTotal = 0, itemCount = 0;
    items.forEach(function (it) {
      subtotal  += it.price * it.quantity;
      mrpTotal  += it.mrp   * it.quantity;
      itemCount += it.quantity;
    });
    var shipping = subtotal === 0 ? 0 : (subtotal >= FREE_SHIP ? 0 : SHIP_COST);

    // Base (Upgrade 1) totals — never change shape.
    var totals = {
      subtotal:              subtotal,
      discount:              Math.max(0, mrpTotal - subtotal),
      shipping:              shipping,
      total:                 subtotal + shipping,
      itemCount:             itemCount,
      freeShippingUnlocked:  subtotal > 0 && subtotal >= FREE_SHIP,
      amountForFreeShipping: subtotal >= FREE_SHIP ? 0 : Math.max(0, FREE_SHIP - subtotal),
      // Offer fields (Upgrade 9) — safe defaults so callers can always read them.
      productDiscount:       0,
      bundleDiscount:        0,
      prepaidDiscount:       0,
      giftingAddOn:          0,
      appliedOffers:         []
    };

    // Layer offers on top when the offer service is available.
    if (global.Offers && typeof global.Offers.getCartOfferSummary === "function") {
      try {
        // Pass cart in launch.js item shape (id, price, qty).
        var rawItems = rawCart().map(function (it) {
          return { id: it.id, price: (typeof it.price === "number" ? it.price : SELL), qty: it.qty || it.quantity || 1 };
        });
        var s = global.Offers.getCartOfferSummary(rawItems, paymentMethod);
        totals.productDiscount = s.productDiscount || 0;
        totals.bundleDiscount  = s.bundleDiscount  || 0;
        totals.prepaidDiscount = s.prepaidDiscount || 0;
        totals.giftingAddOn    = s.giftingAddOn    || 0;
        totals.shipping        = s.shipping;
        totals.total           = s.total;
        totals.appliedOffers   = s.appliedOffers || [];
        totals.freeShippingUnlocked  = s.freeShippingUnlocked;
        totals.amountForFreeShipping = s.amountForFreeShipping;
      } catch (e) { /* fall back to base totals */ }
    }
    return totals;
  }

  // ── Orders (local) ───────────────────────────────────────────────────────
  function getAllOrders()      { return readJSON(ORDERS_KEY, []) || []; }
  function saveAllOrders(list) { return writeJSON(ORDERS_KEY, list); }

  function generateOrderId() {
    return "NF-" + Date.now().toString().slice(-6) + "-" +
           Math.floor(100 + Math.random() * 900);
  }

  /* createLocalOrder(orderPayload)
     orderPayload = {
       orderId?        : reuse an existing id (else auto-generated)
       customer        : { name, phone, email, address, city, state, pincode }
       items?          : snapshot (defaults to current cart — pass BEFORE clearing)
       totals?         : snapshot (defaults to current cart totals)
       paymentMethod?  : "COD" | "Prepaid ..." etc.
       whatsappMessage?: the message text sent to WhatsApp
       notes?          : free text
     } */
  function createLocalOrder(orderPayload) {
    orderPayload = orderPayload || {};
    var cust   = orderPayload.customer || {};
    var items  = orderPayload.items  || getCart();        // snapshot before clear
    var totals = orderPayload.totals || getCartTotals();
    var nowISO = new Date().toISOString();

    var order = {
      orderId:           orderPayload.orderId || generateOrderId(),
      createdAt:         nowISO,
      status:            "pending_whatsapp_confirmation",
      paymentStatus:     "pending",
      fulfillmentStatus: "unfulfilled",
      customer: {
        name:    cust.name    || "",
        phone:   cust.phone   || "",
        email:   cust.email   || "",
        address: cust.address || "",
        city:    cust.city    || "",
        state:   cust.state   || "",
        pincode: cust.pincode || ""
      },
      // ── Customer account link (Upgrade 3) ──
      // customerId is set when the shopper is logged into a local account;
      // customerSnapshot is a lightweight copy of who placed the order.
      customerId:      orderPayload.customerId || null,
      customerSnapshot: orderPayload.customerSnapshot ||
        { name: cust.name || "", phone: cust.phone || "", email: cust.email || "" },
      items:         items,
      totals:        totals,
      // Applied offers (Upgrade 9): [{ offerId, label, amount, type }]
      // amount: negative = discount, positive = add-on (e.g. gift packaging).
      offers:        Array.isArray(orderPayload.offers) ? orderPayload.offers : [],
      source:        "website",
      checkoutType:  "whatsapp",
      paymentMethod: orderPayload.paymentMethod || "COD",
      whatsappMessage: orderPayload.whatsappMessage || "",
      /* ── Courier tracking (Upgrade 7: Shiprocket-ready) ──
         Default state is "order_placed" with one timeline event. AWB / courier
         are filled later — manually via orders-admin.html, or (in future) from a
         backend that talks to Shiprocket privately. NEVER assign a fake AWB here.
         The shape below is the canonical tracking schema; tracking-service.js
         migrates older orders that only had { provider, awb, trackingUrl }.     */
      tracking: {
        provider:         null,           // null | "shiprocket"
        courierName:      null,
        awb:              null,
        shipmentId:       null,
        trackingUrl:      null,
        currentStatus:    "order_placed", // see tracking-service STATUS list
        estimatedDelivery: null,
        lastUpdatedAt:    nowISO,
        shippedAt:        null,
        deliveredAt:      null,
        events: [
          {
            status:      "order_placed",
            label:       "Order placed",
            description: "We have received your order.",
            location:    null,
            timestamp:   nowISO
          }
        ]
      },
      notes: orderPayload.notes || ""
    };

    var all = getAllOrders();
    all.unshift(order);           // newest first
    saveAllOrders(all);
    return order;
  }

  function getOrderById(orderId) {
    if (!orderId) return null;
    var id  = String(orderId).trim().toUpperCase();
    var all = getAllOrders();
    for (var i = 0; i < all.length; i++) {
      if (String(all[i].orderId).toUpperCase() === id) return all[i];
    }
    return null;
  }

  function getCustomerOrders(phoneOrEmail) {
    if (!phoneOrEmail) return [];
    var q       = String(phoneOrEmail).trim().toLowerCase();
    var qDigits = digits(q);
    var qPhone  = last10(q);
    var all     = getAllOrders();
    return all.filter(function (o) {
      var c = o.customer || {};
      var emailMatch = c.email && c.email.toLowerCase() === q;
      var storedPhone = last10(c.phone);
      var phoneMatch = qDigits.length >= 6 &&
                       (storedPhone === qPhone || storedPhone.indexOf(qDigits) !== -1);
      return emailMatch || phoneMatch;
    });
  }

  // ── Checkout mode (Upgrade 2) ────────────────────────────────────────────
  function getCommerceMode() {
    return (CFG.commerceMode || "local");   // "local" | "shopify"
  }

  // True only when mode is shopify, the checkout flag is on, AND Shopify is
  // actually configured (domain + token present).
  function isShopifyCheckoutEnabled() {
    var checkoutOn = !!(CFG.checkout && CFG.checkout.enableShopifyCheckout);
    var configured = !!(global.ShopifyService && global.ShopifyService.isShopifyConfigured());
    return getCommerceMode() === "shopify" && checkoutOn && configured;
  }

  /* createCheckoutSession(cartItems, customerInfo, options)
     Unified entry point. Always resolves (never throws) to:
       { success, mode, checkoutUrl, orderId, message, error }
       mode: "shopify" | "local" | "whatsapp_fallback"                         */
  function createCheckoutSession(cartItems, customerInfo, options) {
    cartItems    = cartItems || getCart();
    customerInfo = customerInfo || {};
    options      = options || {};

    function done(v) { return Promise.resolve(v); }

    if (!cartItems || cartItems.length === 0) {
      return done({ success: false, mode: getCommerceMode(), checkoutUrl: null,
        orderId: null, error: "empty_cart", message: "Your cart is empty." });
    }

    // ── Shopify mode ──
    if (getCommerceMode() === "shopify") {
      if (!global.ShopifyService || !global.ShopifyService.isShopifyConfigured()) {
        // Enabled in intent but not configured → safe WhatsApp fallback.
        return done({ success: false, mode: "whatsapp_fallback", checkoutUrl: null,
          orderId: null, error: "shopify_not_configured",
          message: "Online checkout is being connected. You can still order safely on WhatsApp." });
      }
      return global.ShopifyService.createShopifyCheckout(cartItems, customerInfo)
        .then(function (r) {
          if (r.success) {
            return { success: true, mode: "shopify", checkoutUrl: r.checkoutUrl,
              orderId: null, error: null, message: "Redirecting to secure checkout…" };
          }
          // Map Shopify failure to a consistent fallback response.
          return { success: false, mode: "whatsapp_fallback", checkoutUrl: null,
            orderId: null, error: r.error || "shopify_failed",
            missing: r.missing || null,
            message: r.message || "Secure checkout could not start. Please order on WhatsApp." };
        });
    }

    // ── Local mode (current WhatsApp flow) ──
    // NOTE: the live WhatsApp button uses submitShippingForm() directly, which
    // already calls createLocalOrder(). This branch exists for programmatic use
    // and only creates an order when the caller asks for it (options.createOrder).
    if (options.createOrder) {
      var order = createLocalOrder({
        customer: customerInfo,
        paymentMethod: options.paymentMethod,
        whatsappMessage: options.whatsappMessage,
        notes: options.notes
      });
      return done({ success: true, mode: "whatsapp", checkoutUrl: null,
        orderId: order.orderId, error: null,
        message: "Local order created. Continue on WhatsApp to confirm." });
    }
    return done({ success: true, mode: "local", checkoutUrl: null, orderId: null,
      error: null, message: "Use WhatsApp to place your order." });
  }

  // ── Expose ──────────────────────────────────────────────────────────────
  global.Commerce = {
    config:                  CFG,
    getProducts:             getProducts,
    getProductById:          getProductById,
    getCart:                 getCart,
    addToCart:               addToCart,
    updateCartItem:          updateCartItem,
    removeCartItem:          removeCartItem,
    clearCart:               clearCart,
    getCartTotals:           getCartTotals,
    createLocalOrder:        createLocalOrder,
    getOrderById:            getOrderById,
    getCustomerOrders:       getCustomerOrders,
    // Order persistence helpers (used by tracking-service.js / orders-admin)
    getAllOrders:            getAllOrders,
    saveAllOrders:           saveAllOrders,
    // Upgrade 2 — checkout mode
    getCommerceMode:         getCommerceMode,
    isShopifyCheckoutEnabled: isShopifyCheckoutEnabled,
    createCheckoutSession:   createCheckoutSession
  };
})(window);
