/* ============================================================================
   NAFUME — Shopify Checkout Service   (Upgrade 2)
   ----------------------------------------------------------------------------
   ONLY responsibility: talk to the Shopify *Storefront API* to create a cart
   and hand back its hosted `checkoutUrl`, then redirect the browser there.

   It does NOT touch the local cart, local orders, or the WhatsApp flow — the
   commerce service decides when to call this. If Shopify isn't configured, the
   functions fail safely so the caller can fall back to WhatsApp.

   ⚠️  SECURITY: this file uses the PUBLIC Storefront API token only. Never put
   a Shopify Admin API token in any frontend file.

   Public API (window.ShopifyService):
     isShopifyConfigured()
     mapLocalCartToShopifyLines(cartItems)
     createShopifyCheckout(cartItems, customerInfo)   -> Promise<result>
     redirectToShopifyCheckout(checkoutUrl)
   ========================================================================== */
(function (global) {
  "use strict";

  function cfg() {
    var c = global.COMMERCE_CONFIG || {};
    // Prefer the nested shopify block; fall back to legacy flat fields.
    var s = c.shopify || {};
    return {
      enabled:   !!(s.enabled),
      domain:    (s.storeDomain || c.shopifyStoreDomain || "").trim(),
      token:     (s.storefrontAccessToken || c.shopifyStorefrontAccessToken || "").trim(),
      version:   s.apiVersion || c.shopifyApiVersion || "2025-01"
    };
  }

  /* True only when we have everything needed to call Shopify. */
  function isShopifyConfigured() {
    var s = cfg();
    return s.enabled && s.domain.length > 0 && s.token.length > 0;
  }

  /* Convert local cart items -> Storefront cart lines.
     Returns { lines, missing }:
       lines   = [{ merchandiseId, quantity }]  (only items WITH a variant id)
       missing = [productName, ...]             (items WITHOUT a variant id)   */
  function mapLocalCartToShopifyLines(cartItems) {
    var lines = [];
    var missing = [];
    (cartItems || []).forEach(function (item) {
      var variantId = item.shopifyVariantId || item.variantId || null;
      // If the cart item doesn't carry the variant id, look it up from the catalogue.
      if (!variantId && global.Commerce && global.Commerce.getProductById) {
        var prod = global.Commerce.getProductById(item.productId || item.id);
        if (prod) variantId = prod.shopifyVariantId;
      }
      if (variantId) {
        lines.push({ merchandiseId: variantId, quantity: item.quantity || item.qty || 1 });
      } else {
        missing.push(item.name || item.productId || item.id || "Unknown item");
      }
    });
    return { lines: lines, missing: missing };
  }

  /* Create a Shopify cart and return its hosted checkout URL.
     Resolves to a consistent result object (never throws):
       { success, checkoutUrl, error, missing } */
  function createShopifyCheckout(cartItems, customerInfo) {
    if (!isShopifyConfigured()) {
      return Promise.resolve({
        success: false,
        checkoutUrl: null,
        error: "shopify_not_configured",
        message: "Online checkout is being connected. You can still order safely on WhatsApp."
      });
    }

    if (!cartItems || cartItems.length === 0) {
      return Promise.resolve({
        success: false, checkoutUrl: null, error: "empty_cart",
        message: "Your cart is empty."
      });
    }

    var mapped = mapLocalCartToShopifyLines(cartItems);
    if (mapped.lines.length === 0) {
      return Promise.resolve({
        success: false, checkoutUrl: null, error: "missing_variant_ids",
        missing: mapped.missing,
        message: "This product is not connected to Shopify yet. Please order on WhatsApp."
      });
    }

    var s = cfg();
    var endpoint = "https://" + s.domain + "/api/" + s.version + "/graphql.json";

    var query = [
      "mutation cartCreate($input: CartInput!) {",
      "  cartCreate(input: $input) {",
      "    cart { id checkoutUrl }",
      "    userErrors { field message }",
      "  }",
      "}"
    ].join("\n");

    // buyerIdentity is optional — Shopify's hosted checkout collects address.
    // We pass the email when we have it so the checkout can pre-fill it.
    var input = { lines: mapped.lines };
    if (customerInfo && customerInfo.email) {
      input.buyerIdentity = { email: customerInfo.email };
    }

    return fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": s.token
      },
      body: JSON.stringify({ query: query, variables: { input: input } })
    })
      .then(function (res) {
        if (!res.ok) throw new Error("http_" + res.status);
        return res.json();
      })
      .then(function (json) {
        var data = json && json.data && json.data.cartCreate;
        var userErrors = (data && data.userErrors) || (json && json.errors) || [];
        if (userErrors && userErrors.length) {
          return {
            success: false, checkoutUrl: null, error: "shopify_user_errors",
            userErrors: userErrors,
            message: "Secure checkout could not start right now. Please order on WhatsApp or try again."
          };
        }
        var url = data && data.cart && data.cart.checkoutUrl;
        if (!url) {
          return {
            success: false, checkoutUrl: null, error: "invalid_response",
            message: "Secure checkout could not start right now. Please order on WhatsApp or try again."
          };
        }
        return { success: true, checkoutUrl: url, error: null, cartId: data.cart.id };
      })
      .catch(function (err) {
        return {
          success: false, checkoutUrl: null, error: "network_error",
          detail: String(err && err.message || err),
          message: "Secure checkout could not start right now. Please check your connection or order on WhatsApp."
        };
      });
  }

  /* Send the browser to Shopify's hosted checkout.
     Returns false if the redirect appears to have been blocked. */
  function redirectToShopifyCheckout(checkoutUrl) {
    if (!checkoutUrl) return false;
    try {
      global.location.assign(checkoutUrl);
      return true;
    } catch (e) {
      try { global.location.href = checkoutUrl; return true; }
      catch (e2) { return false; }
    }
  }

  global.ShopifyService = {
    isShopifyConfigured:        isShopifyConfigured,
    mapLocalCartToShopifyLines: mapLocalCartToShopifyLines,
    createShopifyCheckout:      createShopifyCheckout,
    redirectToShopifyCheckout:  redirectToShopifyCheckout
  };
})(window);
