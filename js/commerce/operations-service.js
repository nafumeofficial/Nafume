/* ============================================================================
   NAFUME — Operations Service   (Upgrade 10: operational scalability)
   ----------------------------------------------------------------------------
   A LOCAL operational layer over orders, customers, inventory, reviews and
   analytics. Powers operations-admin.html. Everything is localStorage-based and
   degrades gracefully if other services or data are missing.

   ┌──────────────────────────────────────────────────────────────────────────┐
   │  ⚠️  LOCAL DEMO ONLY — NOT PRODUCTION SECURE                              │
   │  No authentication. Anyone on this browser can read/edit local data.      │
   │  NEVER expose private API keys (Shopify Admin, Shiprocket, payment) here.  │
   │                                                                            │
   │  PRODUCTION ROADMAP (do NOT implement in the frontend):                    │
   │  • Shopify Admin = source of truth for orders, payments, inventory,        │
   │    customers and checkout. The frontend must NOT call the Admin API —      │
   │    use backend/webhooks for sync.                                          │
   │  • Shiprocket: a backend creates shipments, saves AWB/shipmentId, and      │
   │    fetches tracking privately. Never call Shiprocket from the browser.     │
   │  • Customers: Shopify Customer Accounts / Firebase Auth / Supabase Auth /  │
   │    a custom backend with real authentication.                              │
   │  • Reviews: Judge.me, Loox, a Shopify reviews app, or a custom backend.    │
   │  • Analytics: connect GA4, Meta Pixel and Google Ads conversions later.    │
   │  See docs/operational-scalability-system.md.                               │
   └──────────────────────────────────────────────────────────────────────────┘

   Public API (window.OperationsService): see the bottom of this file.
   ========================================================================== */
(function (global) {
  "use strict";

  var CFG   = global.COMMERCE_CONFIG || {};
  var OPS   = CFG.operations || {};
  var KEYS  = CFG.storageKeys || {};
  var INVENTORY_KEY = KEYS.inventory || "nafume_inventory_v1";
  var ANALYTICS_KEY = KEYS.analytics || "nafume_analytics_events";
  var CURRENCY = CFG.currencySymbol || "₹";
  var LOW_STOCK = OPS.lowStockThreshold || 5;
  var DEFAULT_QTY = (typeof OPS.defaultStockQuantity === "number") ? OPS.defaultStockQuantity : 50;

  // Valid status vocabularies (kept in one place).
  var ORDER_STATUSES       = ["pending_whatsapp_confirmation", "confirmed", "cancelled"];
  var PAYMENT_STATUSES     = ["pending", "paid", "failed", "refunded", "cod_pending"];
  var FULFILLMENT_STATUSES = ["unfulfilled", "packed", "shipped", "delivered", "returned", "rto"];
  var TRACKING_STATUSES    = ["order_placed", "confirmed", "packed", "shipped", "in_transit",
                              "out_for_delivery", "delivered", "cancelled", "rto", "unknown"];

  // ── Safe localStorage helpers (never throw) ───────────────────────────────
  function readJSON(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }
  function nowISO() { return new Date().toISOString(); }
  function num(n, d) { var x = Number(n); return isFinite(x) ? x : (d || 0); }

  // ── Service bridges (all optional) ────────────────────────────────────────
  function commerce()  { return global.Commerce || null; }
  function customers() { return global.CustomerService || null; }
  function reviews()   { return global.ReviewService || null; }
  function tracking()  { return global.TrackingService || null; }
  function products()  { return (global.LAUNCH_PRODUCTS && global.LAUNCH_PRODUCTS.length) ? global.LAUNCH_PRODUCTS : []; }
  function cfgPrices() { return { sell: CFG.sellingPrice || 799, mrp: CFG.mrp || 1299 }; }

  // ── Orders ────────────────────────────────────────────────────────────────
  function getAllLocalOrders() {
    var c = commerce();
    if (c && typeof c.getAllOrders === "function") { try { return c.getAllOrders() || []; } catch (e) {} }
    return readJSON(KEYS.orders || "nafume_orders_v2", []) || [];
  }
  function saveAllOrders(list) {
    var c = commerce();
    if (c && typeof c.saveAllOrders === "function") { try { return c.saveAllOrders(list); } catch (e) {} }
    return writeJSON(KEYS.orders || "nafume_orders_v2", list);
  }
  function getOrderById(orderId) {
    if (!orderId) return null;
    var id = String(orderId).trim().toUpperCase();
    var all = getAllLocalOrders();
    for (var i = 0; i < all.length; i++) {
      if (String(all[i].orderId).toUpperCase() === id) return all[i];
    }
    return null;
  }

  // Append a history event + bump updatedAt. Never throws.
  function pushHistory(order, message) {
    if (!order.statusHistory || !Array.isArray(order.statusHistory)) order.statusHistory = [];
    order.statusHistory.push({ at: nowISO(), message: String(message || "") });
    order.updatedAt = nowISO();
  }

  function mutateOrder(orderId, fn) {
    var all = getAllLocalOrders();
    var idx = -1, id = String(orderId).trim().toUpperCase();
    for (var i = 0; i < all.length; i++) {
      if (String(all[i].orderId).toUpperCase() === id) { idx = i; break; }
    }
    if (idx === -1) return null;
    try { fn(all[idx]); } catch (e) { return null; }
    all[idx] = all[idx];
    saveAllOrders(all);
    return all[idx];
  }

  function updateOrderStatus(orderId, statusPayload) {
    statusPayload = statusPayload || {};
    return mutateOrder(orderId, function (o) {
      if (statusPayload.status && ORDER_STATUSES.indexOf(statusPayload.status) > -1) {
        o.status = statusPayload.status;
        pushHistory(o, "Order status → " + statusPayload.status);
      }
      if (statusPayload.paymentStatus) applyPaymentStatus(o, statusPayload.paymentStatus);
      if (statusPayload.fulfillmentStatus) applyFulfillmentStatus(o, statusPayload.fulfillmentStatus);
      if (statusPayload.note) { pushHistory(o, "Note: " + statusPayload.note); addNoteToOrder(o, statusPayload.note); }
    });
  }

  function applyPaymentStatus(o, paymentStatus) {
    if (PAYMENT_STATUSES.indexOf(paymentStatus) === -1) return;
    o.paymentStatus = paymentStatus;
    pushHistory(o, "Payment status → " + paymentStatus);
  }
  function updatePaymentStatus(orderId, paymentStatus) {
    if (PAYMENT_STATUSES.indexOf(paymentStatus) === -1) return null;
    return mutateOrder(orderId, function (o) { applyPaymentStatus(o, paymentStatus); });
  }

  // Map fulfillment → tracking status so the customer timeline stays in sync.
  var FULFILL_TO_TRACKING = {
    packed: "packed", shipped: "shipped", delivered: "delivered",
    returned: "rto", rto: "rto"
  };
  function applyFulfillmentStatus(o, fulfillmentStatus) {
    if (FULFILLMENT_STATUSES.indexOf(fulfillmentStatus) === -1) return;
    o.fulfillmentStatus = fulfillmentStatus;
    pushHistory(o, "Fulfillment status → " + fulfillmentStatus);
    var ts = FULFILL_TO_TRACKING[fulfillmentStatus];
    if (ts && tracking() && typeof tracking().updateLocalTracking === "function") {
      try { tracking().updateLocalTracking(o.orderId, { currentStatus: ts }); } catch (e) {}
    }
  }
  function updateFulfillmentStatus(orderId, fulfillmentStatus) {
    if (FULFILLMENT_STATUSES.indexOf(fulfillmentStatus) === -1) return null;
    // updateLocalTracking re-reads/writes the same store; mutate first, then re-read.
    var updated = mutateOrder(orderId, function (o) { applyFulfillmentStatus(o, fulfillmentStatus); });
    return updated ? getOrderById(orderId) : null;
  }

  function addNoteToOrder(o, note) {
    if (!o.internalNotes || !Array.isArray(o.internalNotes)) o.internalNotes = [];
    o.internalNotes.push({ at: nowISO(), note: String(note || "") });
  }
  function addOrderNote(orderId, note) {
    if (!note || !String(note).trim()) return null;
    return mutateOrder(orderId, function (o) {
      addNoteToOrder(o, String(note).trim());
      pushHistory(o, "Internal note added");
    });
  }

  // Update courier / AWB / tracking — delegates to TrackingService when present.
  function updateOrderTracking(orderId, payload) {
    payload = payload || {};
    if (tracking() && typeof tracking().updateLocalTracking === "function") {
      try { tracking().updateLocalTracking(orderId, payload); } catch (e) {}
    } else {
      // Fallback: write directly onto the order's tracking object.
      mutateOrder(orderId, function (o) {
        o.tracking = o.tracking || {};
        ["provider", "courierName", "awb", "shipmentId", "trackingUrl", "currentStatus", "estimatedDelivery"]
          .forEach(function (k) { if (typeof payload[k] !== "undefined") o.tracking[k] = payload[k]; });
        o.tracking.lastUpdatedAt = nowISO();
      });
    }
    mutateOrder(orderId, function (o) { pushHistory(o, "Tracking updated"); });
    return getOrderById(orderId);
  }

  // ── Customers ─────────────────────────────────────────────────────────────
  function getAllCustomers() {
    var cs = customers();
    if (cs && typeof cs.getAllCustomers === "function") { try { return cs.getAllCustomers() || []; } catch (e) {} }
    return readJSON(KEYS.customers || "nafume_customers", []) || [];
  }

  // Aggregate a customer's local orders into a support-friendly summary.
  function getCustomerSummary(customerId) {
    var list = getAllCustomers();
    var c = null;
    for (var i = 0; i < list.length; i++) { if (list[i].customerId === customerId) { c = list[i]; break; } }
    if (!c) return null;
    var orders = getAllLocalOrders().filter(function (o) {
      return o.customerId === customerId ||
        (o.customer && c.phone && last10(o.customer.phone) === last10(c.phone));
    });
    var totalSpent = orders.reduce(function (s, o) { return s + num(o.totals && o.totals.total); }, 0);
    var lastOrder = orders.length ? orders[0].createdAt : null;
    return {
      customer: c, orders: orders, totalOrders: orders.length,
      totalSpent: totalSpent, lastOrderDate: lastOrder
    };
  }

  function last10(s) { var d = String(s == null ? "" : s).replace(/\D/g, ""); return d.length > 10 ? d.slice(-10) : d; }

  // Build the customer table (merges account customers + guest order contacts).
  function getCustomerTable() {
    var rows = {};
    getAllCustomers().forEach(function (c) {
      var a = c.defaultAddress || {};
      rows[c.customerId] = {
        customerId: c.customerId, name: c.name || "", phone: c.phone || "", email: c.email || "",
        city: a.city || "", state: a.state || "", pincode: a.pincode || "",
        totalOrders: 0, totalSpent: 0, lastOrderDate: null, createdAt: c.createdAt || ""
      };
    });
    getAllLocalOrders().forEach(function (o) {
      var key = o.customerId;
      var cust = o.customer || {};
      if (!key) key = "guest:" + last10(cust.phone || cust.email || o.orderId);
      if (!rows[key]) {
        rows[key] = {
          customerId: key, name: cust.name || "", phone: cust.phone || "", email: cust.email || "",
          city: cust.city || "", state: cust.state || "", pincode: cust.pincode || "",
          totalOrders: 0, totalSpent: 0, lastOrderDate: null, createdAt: o.createdAt || ""
        };
      }
      rows[key].totalOrders += 1;
      rows[key].totalSpent  += num(o.totals && o.totals.total);
      if (!rows[key].lastOrderDate || o.createdAt > rows[key].lastOrderDate) rows[key].lastOrderDate = o.createdAt;
    });
    return Object.keys(rows).map(function (k) { return rows[k]; });
  }

  // ── Inventory (local store keyed by productId) ────────────────────────────
  function readInventory() { return readJSON(INVENTORY_KEY, {}) || {}; }
  function writeInventory(map) { return writeJSON(INVENTORY_KEY, map); }

  function deriveStockStatus(qty, lowThreshold, allowBackorder) {
    if (qty <= 0) return allowBackorder ? "preorder" : "out_of_stock";
    if (qty <= (lowThreshold || LOW_STOCK)) return "low_stock";
    return "in_stock";
  }

  // Returns the stock record for a product, seeding a default if none exists.
  function getProductStock(productId) {
    var inv = readInventory();
    var rec = inv[productId];
    if (!rec) {
      rec = { inventoryQuantity: DEFAULT_QTY, lowStockThreshold: LOW_STOCK, allowBackorder: false };
    }
    rec.inventoryQuantity = num(rec.inventoryQuantity, DEFAULT_QTY);
    rec.stockStatus = deriveStockStatus(rec.inventoryQuantity, rec.lowStockThreshold, rec.allowBackorder);
    return rec;
  }

  function getInventorySummary() {
    var prices = cfgPrices();
    return products().map(function (p) {
      var rec = getProductStock(p.id);
      return {
        productId: p.id, name: p.displayName || p.name, sku: p.sku || p.id,
        inventoryQuantity: rec.inventoryQuantity, stockStatus: rec.stockStatus,
        lowStockThreshold: rec.lowStockThreshold, allowBackorder: !!rec.allowBackorder,
        price: prices.sell, mrp: prices.mrp,
        lowStock: rec.stockStatus === "low_stock" || rec.stockStatus === "out_of_stock"
      };
    });
  }

  function updateLocalInventory(productId, quantity) {
    if (!productId) return null;
    var q = parseInt(quantity, 10);
    if (!isFinite(q) || q < 0) return null;   // invalid quantity → ignore
    var inv = readInventory();
    var rec = inv[productId] || { lowStockThreshold: LOW_STOCK, allowBackorder: false };
    rec.inventoryQuantity = q;
    rec.stockStatus = deriveStockStatus(q, rec.lowStockThreshold, rec.allowBackorder);
    rec.updatedAt = nowISO();
    inv[productId] = rec;
    writeInventory(inv);
    return getProductStock(productId);
  }

  function getLowStockProducts() {
    return getInventorySummary().filter(function (i) {
      return i.stockStatus === "low_stock" || i.stockStatus === "out_of_stock";
    });
  }

  /* decrementInventoryForOrder(order)
     Called after a LOCAL WhatsApp order is created. Reduces stock by ordered qty.
     ⚠️ Shopify should be the source of truth when live checkout is enabled —
     do NOT decrement local inventory for Shopify orders unless a real
     order-sync/webhook exists. */
  function decrementInventoryForOrder(order) {
    if (!order || !order.items) return;
    if (order.checkoutType && order.checkoutType !== "whatsapp") return; // Shopify = source of truth
    var inv = readInventory();
    var changed = false;
    order.items.forEach(function (it) {
      var pid = it.id || it.productId;
      var qty = num(it.quantity || it.qty, 0);
      if (!pid || qty <= 0) return;
      var rec = inv[pid];
      if (!rec || typeof rec.inventoryQuantity !== "number") return; // no stored stock → skip safely
      rec.inventoryQuantity = Math.max(0, rec.inventoryQuantity - qty);
      rec.stockStatus = deriveStockStatus(rec.inventoryQuantity, rec.lowStockThreshold, rec.allowBackorder);
      rec.updatedAt = nowISO();
      inv[pid] = rec;
      changed = true;
    });
    if (changed) writeInventory(inv);
  }

  // ── Reviews ───────────────────────────────────────────────────────────────
  function getPendingReviews() {
    var rs = reviews();
    if (!rs || typeof rs.getAllReviews !== "function") return [];
    try { return rs.getAllReviews().filter(function (r) { return r.status === "pending"; }); }
    catch (e) { return []; }
  }

  // ── Support queue (orders that need attention) ────────────────────────────
  function getSupportQueue() {
    return getAllLocalOrders().filter(function (o) {
      return o.status === "pending_whatsapp_confirmation" ||
             o.paymentStatus === "pending" || o.paymentStatus === "failed" ||
             o.fulfillmentStatus === "unfulfilled";
    });
  }

  // ── Operations summary (overview cards) ───────────────────────────────────
  function getOperationsSummary() {
    var orders = getAllLocalOrders();
    var revenue = orders.reduce(function (s, o) { return s + num(o.totals && o.totals.total); }, 0);
    return {
      totalOrders:           orders.length,
      revenueEstimate:       revenue,
      pendingWhatsapp:       orders.filter(function (o) { return o.status === "pending_whatsapp_confirmation"; }).length,
      pendingPayments:       orders.filter(function (o) { return o.paymentStatus === "pending" || o.paymentStatus === "cod_pending"; }).length,
      unfulfilledOrders:     orders.filter(function (o) { return o.fulfillmentStatus === "unfulfilled"; }).length,
      lowStockProducts:      getLowStockProducts().length,
      pendingReviews:        getPendingReviews().length,
      totalCustomers:        getCustomerTable().length,
      currency:              CURRENCY
    };
  }

  // ── CSV export ────────────────────────────────────────────────────────────
  function csvCell(v) {
    var s = (v == null) ? "" : String(v);
    if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function toCsv(headers, rows) {
    var lines = [headers.map(csvCell).join(",")];
    rows.forEach(function (r) { lines.push(r.map(csvCell).join(",")); });
    return lines.join("\n");
  }

  function exportOrdersCsv() {
    var headers = ["orderId", "createdAt", "customerName", "phone", "email", "city", "pincode",
      "itemCount", "subtotal", "discount", "shipping", "total", "paymentStatus",
      "fulfillmentStatus", "checkoutType", "awb", "courierName"];
    var rows = getAllLocalOrders().map(function (o) {
      var c = o.customer || {}, t = o.totals || {}, tr = o.tracking || {};
      var itemCount = (o.items || []).reduce(function (s, it) { return s + num(it.quantity || it.qty, 1); }, 0);
      return [o.orderId, o.createdAt, c.name, c.phone, c.email, c.city, c.pincode,
        itemCount, num(t.subtotal), num(t.discount || t.bundleDiscount), num(t.shipping), num(t.total),
        o.paymentStatus, o.fulfillmentStatus, o.checkoutType, tr.awb, tr.courierName];
    });
    return toCsv(headers, rows);
  }

  function exportCustomersCsv() {
    var headers = ["customerId", "name", "phone", "email", "city", "state", "pincode",
      "totalOrders", "totalSpent", "createdAt"];
    var rows = getCustomerTable().map(function (c) {
      return [c.customerId, c.name, c.phone, c.email, c.city, c.state, c.pincode,
        c.totalOrders, c.totalSpent, c.createdAt];
    });
    return toCsv(headers, rows);
  }

  function exportReviewsCsv() {
    var rs = reviews();
    var all = (rs && rs.getAllReviews) ? (rs.getAllReviews() || []) : [];
    var headers = ["reviewId", "productId", "customerName", "rating", "title", "status", "verifiedBuyer", "createdAt"];
    var rows = all.map(function (r) {
      return [r.reviewId, r.productId, r.customerName, r.rating, r.title, r.status, !!r.verifiedBuyer, r.createdAt];
    });
    return toCsv(headers, rows);
  }

  function exportInventoryCsv() {
    var headers = ["productId", "name", "sku", "inventoryQuantity", "stockStatus", "price", "mrp"];
    var rows = getInventorySummary().map(function (i) {
      return [i.productId, i.name, i.sku, i.inventoryQuantity, i.stockStatus, i.price, i.mrp];
    });
    return toCsv(headers, rows);
  }

  // Trigger a browser download of a CSV string. Returns false if it fails.
  function downloadCsv(filename, csvContent) {
    try {
      if (csvContent == null) return false;
      var blob = new Blob(["﻿" + csvContent], { type: "text/csv;charset=utf-8;" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = filename || "export.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return true;
    } catch (e) { return false; }
  }

  // ── Analytics events (local, lightweight) ─────────────────────────────────
  var ALLOWED_EVENTS = ["product_view", "add_to_cart", "begin_checkout",
    "whatsapp_checkout_started", "shopify_checkout_started", "order_created",
    "review_submitted", "account_login", "track_order_search", "upsell_added",
    "bundle_started", "bundle_completed"];

  function recordAnalyticsEvent(eventName, payload) {
    try {
      if (!OPS.enableAnalyticsEvents) return false;
      if (!eventName) return false;
      var events = readJSON(ANALYTICS_KEY, []) || [];
      events.push({
        event: String(eventName),
        payload: payload || {},
        at: nowISO(),
        // Hint for the future GA4/Pixel bridge — not a known event is still stored.
        known: ALLOWED_EVENTS.indexOf(String(eventName)) > -1
      });
      // Keep the local log from growing unbounded.
      if (events.length > 1000) events = events.slice(events.length - 1000);
      writeJSON(ANALYTICS_KEY, events);
      return true;
    } catch (e) { return false; }
  }
  function getAnalyticsEvents() { return readJSON(ANALYTICS_KEY, []) || []; }

  // ── Clear demo data (guarded) ─────────────────────────────────────────────
  /* clearLocalDemoDataSafely({ confirmText, scopes })
     Requires the EXACT confirmation phrase. scopes is an optional array of:
     "orders" | "customers" | "reviews" | "inventory" | "analytics".
     Defaults to all. Returns { success, cleared:[], message }. */
  var CONFIRM_PHRASE = "DELETE LOCAL DEMO DATA";
  function clearLocalDemoDataSafely(options) {
    options = options || {};
    if (options.confirmText !== CONFIRM_PHRASE) {
      return { success: false, cleared: [], message: 'Confirmation text did not match "' + CONFIRM_PHRASE + '".' };
    }
    var map = {
      orders:    KEYS.orders    || "nafume_orders_v2",
      customers: KEYS.customers || "nafume_customers",
      reviews:   KEYS.reviews   || "nafume_product_reviews",
      inventory: INVENTORY_KEY,
      analytics: ANALYTICS_KEY
    };
    var scopes = (options.scopes && options.scopes.length) ? options.scopes : Object.keys(map);
    var cleared = [];
    scopes.forEach(function (s) {
      if (map[s]) { try { localStorage.removeItem(map[s]); cleared.push(s); } catch (e) {} }
    });
    return { success: true, cleared: cleared, message: "Cleared: " + cleared.join(", ") };
  }

  // ── Expose ────────────────────────────────────────────────────────────────
  global.OperationsService = {
    CONFIRM_PHRASE:          CONFIRM_PHRASE,
    ORDER_STATUSES:          ORDER_STATUSES,
    PAYMENT_STATUSES:        PAYMENT_STATUSES,
    FULFILLMENT_STATUSES:    FULFILLMENT_STATUSES,
    TRACKING_STATUSES:       TRACKING_STATUSES,
    getOperationsSummary:    getOperationsSummary,
    getAllLocalOrders:       getAllLocalOrders,
    getOrderById:            getOrderById,
    updateOrderStatus:       updateOrderStatus,
    updatePaymentStatus:     updatePaymentStatus,
    updateFulfillmentStatus: updateFulfillmentStatus,
    updateOrderTracking:     updateOrderTracking,
    addOrderNote:            addOrderNote,
    getAllCustomers:         getAllCustomers,
    getCustomerTable:        getCustomerTable,
    getCustomerSummary:      getCustomerSummary,
    getInventorySummary:     getInventorySummary,
    getProductStock:         getProductStock,
    updateLocalInventory:    updateLocalInventory,
    getLowStockProducts:     getLowStockProducts,
    decrementInventoryForOrder: decrementInventoryForOrder,
    getPendingReviews:       getPendingReviews,
    getSupportQueue:         getSupportQueue,
    exportOrdersCsv:         exportOrdersCsv,
    exportCustomersCsv:      exportCustomersCsv,
    exportReviewsCsv:        exportReviewsCsv,
    exportInventoryCsv:      exportInventoryCsv,
    downloadCsv:             downloadCsv,
    recordAnalyticsEvent:    recordAnalyticsEvent,
    getAnalyticsEvents:      getAnalyticsEvents,
    clearLocalDemoDataSafely: clearLocalDemoDataSafely
  };
})(window);
