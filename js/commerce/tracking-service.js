/* ============================================================================
   NAFUME — Tracking Service   (Upgrade 7: Shiprocket-ready tracking foundation)
   ----------------------------------------------------------------------------
   A safe, framework-free tracking layer over local orders. It:
     • normalizes the tracking object on every order (migrates older orders)
     • finds orders by Order ID, phone, or AWB number
     • builds a clean 7-step delivery timeline from a status
     • lets a local admin attach AWB / courier / status (orders-admin.html)
     • is ready for live Shiprocket tracking VIA A BACKEND ONLY

   ┌──────────────────────────────────────────────────────────────────────────┐
   │  🔒 SECURITY                                                              │
   │  This file runs in the browser. It NEVER calls the Shiprocket API and    │
   │  NEVER holds Shiprocket credentials. `fetchLiveTrackingIfAvailable()`     │
   │  only calls YOUR OWN backend endpoint (COMMERCE_CONFIG.tracking.          │
   │  backendTrackingEndpoint) if you configure one. The backend is what       │
   │  talks to Shiprocket privately. See docs/shiprocket-tracking-setup.md.    │
   └──────────────────────────────────────────────────────────────────────────┘

   Public API (window.TrackingService):
     normalizeTracking(order)
     getTrackingByOrderId(orderId)
     findOrderForTracking(query)        -> { orders:[], matchedBy }
     findOrderByAwb(awb)
     updateLocalTracking(orderId, payload)
     buildTrackingTimeline(order)       -> [ { key,label,description,state,timestamp } ]
     getTrackingStatusLabel(status)
     getTrackingProgress(status)        -> { index,total,percent,isTerminal }
     getPublicTrackingUrl(awb, courierName)
     isShiprocketTrackingConfigured()
     fetchLiveTrackingIfAvailable(query) -> Promise<result>
   ========================================================================== */
(function (global) {
  "use strict";

  var CFG      = global.COMMERCE_CONFIG || {};
  var TCFG     = CFG.tracking || {};
  var ORDERS_KEY = (CFG.storageKeys && CFG.storageKeys.orders) || "nafume_orders_v2";

  // ── The canonical delivery journey (forward-moving steps) ─────────────────
  var TIMELINE_STEPS = [
    { key: "order_placed",     label: "Order Placed",      description: "We have received your order." },
    { key: "confirmed",        label: "Confirmed",         description: "Your order has been confirmed." },
    { key: "packed",           label: "Packed",            description: "Your fragrance is packed and ready." },
    { key: "shipped",          label: "Shipped",           description: "Your parcel has been handed to the courier." },
    { key: "in_transit",       label: "In Transit",        description: "Your parcel is on the way." },
    { key: "out_for_delivery", label: "Out for Delivery",  description: "Your parcel is out for delivery today." },
    { key: "delivered",        label: "Delivered",         description: "Your parcel has been delivered." }
  ];

  // Human labels for every status (including non-linear ones).
  var STATUS_LABELS = {
    order_placed:     "Order Placed",
    confirmed:        "Confirmed",
    packed:           "Packed",
    shipped:          "Shipped",
    in_transit:       "In Transit",
    out_for_delivery: "Out for Delivery",
    delivered:        "Delivered",
    cancelled:        "Cancelled",
    rto:              "Returned to Origin",
    unknown:          "Status Unavailable"
  };

  var VALID_STATUSES = Object.keys(STATUS_LABELS);

  // ── localStorage helpers (never throw) ────────────────────────────────────
  function readOrders() {
    if (global.Commerce && typeof global.Commerce.getAllOrders === "function") {
      try { return global.Commerce.getAllOrders() || []; } catch (e) { /* fall through */ }
    }
    try { var v = localStorage.getItem(ORDERS_KEY); return v ? JSON.parse(v) : []; }
    catch (e) { return []; }   // localStorage unavailable / malformed
  }
  function writeOrders(list) {
    if (global.Commerce && typeof global.Commerce.saveAllOrders === "function") {
      try { return global.Commerce.saveAllOrders(list); } catch (e) { /* fall through */ }
    }
    try { localStorage.setItem(ORDERS_KEY, JSON.stringify(list)); return true; }
    catch (e) { return false; }
  }
  function digits(s) { return String(s == null ? "" : s).replace(/\D/g, ""); }
  function last10(s) { var d = digits(s); return d.length > 10 ? d.slice(-10) : d; }
  function nowISO()  { return new Date().toISOString(); }

  // ── Status → forward step index (non-linear statuses map to a sensible spot)
  function statusIndex(status) {
    for (var i = 0; i < TIMELINE_STEPS.length; i++) {
      if (TIMELINE_STEPS[i].key === status) return i;
    }
    if (status === "delivered") return TIMELINE_STEPS.length - 1;
    return -1; // unknown / cancelled / rto — not on the linear path
  }

  // Derive a starting tracking status from the legacy order fields, so old
  // orders (created before Upgrade 7) still show a sensible timeline.
  function deriveStatusFromOrder(order) {
    if (!order) return "order_placed";
    var s  = String(order.status || "").toLowerCase();
    var fs = String(order.fulfillmentStatus || "").toLowerCase();
    if (s === "delivered" || fs === "delivered") return "delivered";
    if (s === "cancelled") return "cancelled";
    if (s === "shipped"   || fs === "fulfilled" || fs === "shipped") return "shipped";
    if (s === "confirmed") return "confirmed";
    return "order_placed";
  }

  /* normalizeTracking(order)
     Returns a complete, valid tracking object. Never mutates the input.
     Handles: missing tracking, older minimal tracking, malformed data. */
  function normalizeTracking(order) {
    order = order || {};
    var t = (order.tracking && typeof order.tracking === "object") ? order.tracking : {};
    var createdAt = order.createdAt || t.lastUpdatedAt || nowISO();

    // currentStatus: use stored, else migrate from order.status.
    var currentStatus = t.currentStatus;
    if (!currentStatus || VALID_STATUSES.indexOf(currentStatus) === -1) {
      currentStatus = deriveStatusFromOrder(order);
    }

    // events: keep valid ones, else seed a single "order placed" event.
    var events = Array.isArray(t.events) ? t.events.filter(function (e) {
      return e && e.status && e.timestamp;
    }) : [];
    if (!events.length) {
      events = [{
        status:      "order_placed",
        label:       STATUS_LABELS.order_placed,
        description: "We have received your order.",
        location:    null,
        timestamp:   createdAt
      }];
    }

    return {
      provider:          t.provider || null,
      courierName:       t.courierName || null,
      awb:               t.awb || null,
      shipmentId:        t.shipmentId || null,
      trackingUrl:       t.trackingUrl || null,
      currentStatus:     currentStatus,
      estimatedDelivery: t.estimatedDelivery || null,
      lastUpdatedAt:     t.lastUpdatedAt || createdAt,
      shippedAt:         t.shippedAt || null,
      deliveredAt:       t.deliveredAt || null,
      events:            events
    };
  }

  // ── Lookups ───────────────────────────────────────────────────────────────
  function getTrackingByOrderId(orderId) {
    if (!orderId) return null;
    var order = (global.Commerce && global.Commerce.getOrderById)
      ? global.Commerce.getOrderById(orderId)
      : findInList(readOrders(), function (o) {
          return String(o.orderId).toUpperCase() === String(orderId).trim().toUpperCase();
        });
    if (!order) return null;
    return { order: order, tracking: normalizeTracking(order) };
  }

  function findInList(list, pred) {
    for (var i = 0; i < list.length; i++) { if (pred(list[i])) return list[i]; }
    return null;
  }

  function findOrderByAwb(awb) {
    var q = String(awb == null ? "" : awb).trim().toLowerCase();
    if (!q) return null;
    var all = readOrders();
    return findInList(all, function (o) {
      var t = normalizeTracking(o);
      return t.awb && String(t.awb).trim().toLowerCase() === q;
    });
  }

  /* findOrderForTracking(query)
     Tries Order ID → AWB → phone (in that order). Always returns:
       { orders: [order, ...], matchedBy: "orderId"|"awb"|"phone"|null } */
  function findOrderForTracking(query) {
    var q = String(query == null ? "" : query).trim();
    if (!q) return { orders: [], matchedBy: null };

    // 1) Order ID (e.g. NF-123456-789)
    var byId = (global.Commerce && global.Commerce.getOrderById)
      ? global.Commerce.getOrderById(q) : null;
    if (byId) return { orders: [byId], matchedBy: "orderId" };

    // 2) AWB / tracking number
    var byAwb = findOrderByAwb(q);
    if (byAwb) return { orders: [byAwb], matchedBy: "awb" };

    // 3) Phone (last-10 match) — may return multiple orders
    if (digits(q).length >= 6 && global.Commerce && global.Commerce.getCustomerOrders) {
      var byPhone = global.Commerce.getCustomerOrders(q) || [];
      if (byPhone.length) return { orders: byPhone, matchedBy: "phone" };
    }
    return { orders: [], matchedBy: null };
  }

  /* updateLocalTracking(orderId, payload)
     Merges a tracking payload into a local order. Appends a timeline event when
     currentStatus changes. Used by orders-admin.html. Returns updated order|null.
     payload may include: provider, courierName, awb, shipmentId, trackingUrl,
                          currentStatus, estimatedDelivery, eventLocation, eventNote */
  function updateLocalTracking(orderId, payload) {
    if (!orderId) return null;
    payload = payload || {};
    var id  = String(orderId).trim().toUpperCase();
    var all = readOrders();
    var idx = -1;
    for (var i = 0; i < all.length; i++) {
      if (String(all[i].orderId).toUpperCase() === id) { idx = i; break; }
    }
    if (idx === -1) return null;

    var order = all[idx];
    var t = normalizeTracking(order);
    var prevStatus = t.currentStatus;

    // Merge simple fields when provided (empty string clears, undefined keeps).
    ["provider", "courierName", "awb", "shipmentId", "trackingUrl", "estimatedDelivery"]
      .forEach(function (k) {
        if (typeof payload[k] !== "undefined") t[k] = payload[k] === "" ? null : payload[k];
      });

    // Status change → validate + append an event.
    if (payload.currentStatus && VALID_STATUSES.indexOf(payload.currentStatus) !== -1
        && payload.currentStatus !== prevStatus) {
      t.currentStatus = payload.currentStatus;
      var label = STATUS_LABELS[payload.currentStatus] || payload.currentStatus;
      t.events = (t.events || []).concat([{
        status:      payload.currentStatus,
        label:       label,
        description: payload.eventNote || defaultDescription(payload.currentStatus),
        location:    payload.eventLocation || null,
        timestamp:   nowISO()
      }]);
      if (payload.currentStatus === "shipped" && !t.shippedAt) t.shippedAt = nowISO();
      if (payload.currentStatus === "delivered" && !t.deliveredAt) t.deliveredAt = nowISO();
    }

    // If an AWB/courier was attached, mark the provider as shiprocket by default.
    if (t.awb && !t.provider) t.provider = "shiprocket";

    t.lastUpdatedAt = nowISO();
    order.tracking = t;

    // Keep the order's top-level status roughly in sync (non-breaking, optional).
    if (t.currentStatus === "delivered") order.fulfillmentStatus = "delivered";
    else if (t.currentStatus === "shipped" || t.currentStatus === "in_transit"
             || t.currentStatus === "out_for_delivery") order.fulfillmentStatus = "shipped";

    all[idx] = order;
    writeOrders(all);
    return order;
  }

  function defaultDescription(status) {
    var step = findInList(TIMELINE_STEPS, function (s) { return s.key === status; });
    if (step) return step.description;
    if (status === "cancelled") return "This order has been cancelled.";
    if (status === "rto")       return "This parcel is being returned to origin.";
    return "Status updated.";
  }

  /* buildTrackingTimeline(order)
     Returns the 7 forward steps, each marked completed | current | upcoming.
     For cancelled / rto orders, returns a short alternate timeline instead.   */
  function buildTrackingTimeline(order) {
    var t = normalizeTracking(order);
    var status = t.currentStatus;

    // Alternate states sit OFF the normal delivery path.
    if (status === "cancelled" || status === "rto") {
      return {
        type: status,                            // "cancelled" | "rto"
        label: STATUS_LABELS[status],
        steps: [
          { key: "order_placed", label: "Order Placed", description: "We received your order.",
            state: "completed", timestamp: eventTime(t, "order_placed") || order.createdAt },
          { key: status, label: STATUS_LABELS[status], description: defaultDescription(status),
            state: "current", timestamp: eventTime(t, status) || t.lastUpdatedAt }
        ]
      };
    }

    var currentIdx = statusIndex(status);
    if (currentIdx === -1) currentIdx = 0; // unknown → treat as just placed

    var steps = TIMELINE_STEPS.map(function (step, i) {
      var state = i < currentIdx ? "completed" : (i === currentIdx ? "current" : "upcoming");
      return {
        key:         step.key,
        label:       step.label,
        description: step.description,
        state:       state,
        timestamp:   eventTime(t, step.key)
      };
    });
    return { type: "normal", label: STATUS_LABELS[status], steps: steps };
  }

  // Most recent timestamp recorded for a given status (or null).
  function eventTime(tracking, statusKey) {
    var found = null;
    (tracking.events || []).forEach(function (e) {
      if (e.status === statusKey) found = e.timestamp;
    });
    return found;
  }

  function getTrackingStatusLabel(status) {
    return STATUS_LABELS[status] || (status ? String(status).replace(/_/g, " ") : "Status Unavailable");
  }

  /* getTrackingProgress(status) -> { index, total, percent, isTerminal } */
  function getTrackingProgress(status) {
    var total = TIMELINE_STEPS.length;
    if (status === "cancelled" || status === "rto") {
      return { index: 0, total: total, percent: 0, isTerminal: true };
    }
    var idx = statusIndex(status);
    if (idx === -1) idx = 0;
    var percent = Math.round((idx / (total - 1)) * 100);
    return { index: idx, total: total, percent: percent, isTerminal: status === "delivered" };
  }

  /* getPublicTrackingUrl(awb, courierName)
     Conservative by design. We do NOT invent courier URLs. Returns null unless
     a verified tracking URL is already known. The admin can paste an exact
     trackingUrl per order (preferred). If you later verify Shiprocket's public
     tracking URL format for your account, enable it below.                     */
  function getPublicTrackingUrl(awb, courierName) {
    if (!awb) return null;
    // ── Optional (disabled by default) ──────────────────────────────────────
    // Shiprocket exposes a public tracking page, but the exact format can vary
    // by account. Verify YOUR working URL first, then uncomment:
    //   return "https://shiprocket.co/tracking/" + encodeURIComponent(awb);
    return null;
  }

  // ── Shiprocket / backend readiness ────────────────────────────────────────
  function isShiprocketTrackingConfigured() {
    return !!(TCFG.enableShiprocket &&
              TCFG.shiprocketTrackingMode === "backend_proxy" &&
              TCFG.backendTrackingEndpoint);
  }

  /* fetchLiveTrackingIfAvailable(query)
     Resolves (never rejects) to a consistent result. It ONLY calls your own
     backend endpoint — never Shiprocket directly. When no backend is configured
     it returns the LOCAL order, so the page always has something to show.

     Returns: {
       mode: "backend" | "local" | "not_found",
       success: boolean,
       order: order|null,
       tracking: trackingObject|null,
       live: sanitized backend payload | null,
       message: string
     } */
  function fetchLiveTrackingIfAvailable(query) {
    var local = findOrderForTracking(query);
    var localOrder = local.orders[0] || null;

    // No backend → local-only (safe default). No Shiprocket call from browser.
    if (!isShiprocketTrackingConfigured()) {
      return Promise.resolve({
        mode: localOrder ? "local" : "not_found",
        success: !!localOrder,
        order: localOrder,
        tracking: localOrder ? normalizeTracking(localOrder) : null,
        live: null,
        message: localOrder
          ? (TCFG.supportMessage || "Showing your latest saved order status.")
          : "We could not find this order on this device."
      });
    }

    // Backend proxy mode → call YOUR endpoint only. It holds the Shiprocket
    // token server-side and returns a sanitized status.
    var endpoint = TCFG.backendTrackingEndpoint;
    var url = endpoint + (endpoint.indexOf("?") === -1 ? "?" : "&") + "q=" + encodeURIComponent(query);

    return fetch(url, { method: "GET", headers: { "Accept": "application/json" } })
      .then(function (res) {
        if (!res.ok) throw new Error("backend_status_" + res.status);
        return res.json();
      })
      .then(function (data) {
        return {
          mode: "backend", success: true,
          order: localOrder,
          tracking: localOrder ? normalizeTracking(localOrder) : null,
          live: data || null,
          message: "Live tracking loaded."
        };
      })
      .catch(function (err) {
        // Backend missing / failed → graceful local fallback.
        return {
          mode: localOrder ? "local" : "not_found",
          success: !!localOrder,
          order: localOrder,
          tracking: localOrder ? normalizeTracking(localOrder) : null,
          live: null,
          message: "Live tracking is temporarily unavailable. Showing saved status.",
          error: String(err && err.message || err)
        };
      });
  }

  // ── Expose ────────────────────────────────────────────────────────────────
  global.TrackingService = {
    STATUS_LABELS:               STATUS_LABELS,
    TIMELINE_STEPS:              TIMELINE_STEPS,
    normalizeTracking:           normalizeTracking,
    getTrackingByOrderId:        getTrackingByOrderId,
    findOrderForTracking:        findOrderForTracking,
    findOrderByAwb:              findOrderByAwb,
    updateLocalTracking:         updateLocalTracking,
    buildTrackingTimeline:       buildTrackingTimeline,
    getTrackingStatusLabel:      getTrackingStatusLabel,
    getTrackingProgress:         getTrackingProgress,
    getPublicTrackingUrl:        getPublicTrackingUrl,
    isShiprocketTrackingConfigured: isShiprocketTrackingConfigured,
    fetchLiveTrackingIfAvailable: fetchLiveTrackingIfAvailable
  };
})(window);
