/* ============================================================================
   NAFUME — Customer Account Service   (Upgrade 3)
   ----------------------------------------------------------------------------
   A LOCAL, DEMO-ONLY customer account + order-history layer. It gives the site
   a clean account UX and data shape that can later be swapped for a real
   provider (Shopify Customer Accounts / Firebase / Supabase / custom backend).

   ⚠️  THIS IS NOT SECURE AUTHENTICATION.
       - No real OTP is sent. The demo OTP is "123456".
       - Profiles live in localStorage (readable by anyone on the device).
       - Never store real passwords here and never treat this as production auth.
       See docs/customer-account-setup.md before going live.

   Self-contained: depends on nothing. If window.Commerce is present it is used
   to read/attach orders; otherwise it falls back to direct localStorage.

   Public API (window.CustomerService):
     getCurrentCustomer()
     isCustomerLoggedIn()
     startMockLogin(identifier)
     verifyMockOtp(identifier, otp)
     createOrUpdateCustomer(profileData)
     updateCustomerAddress(addressData)
     logoutCustomer()
     getCustomerOrders()
     attachOrderToCustomer(orderId, customerIdentifier)
     getSavedCheckoutDetails()
     saveCheckoutDetailsFromCustomer(details)
     renderAccountNav()                     // header "Account / My Account" link
   ========================================================================== */
(function (global) {
  "use strict";

  // Demo OTP — replace with a real OTP provider before production.
  // TODO[auth]: integrate a real OTP/SMS/email provider + backend verification.
  var DEMO_OTP = "123456";

  var CFG  = global.COMMERCE_CONFIG || {};
  var KEYS = (CFG.storageKeys || {});
  var CUSTOMERS_KEY = KEYS.customers       || "nafume_customers";
  var CURRENT_KEY   = KEYS.currentCustomer || "nafume_current_customer";
  var SESSION_KEY   = KEYS.customerSession || "nafume_customer_session";
  var ORDERS_KEY    = KEYS.orders          || "nafume_orders_v2";

  // ── safe localStorage helpers (never throw) ──────────────────────────────
  function readJSON(key, fallback) {
    try { var v = global.localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function writeJSON(key, val) {
    try { global.localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }   // e.g. storage disabled / quota / private mode
  }
  function removeKey(key) {
    try { global.localStorage.removeItem(key); return true; } catch (e) { return false; }
  }
  function storageAvailable() {
    try {
      var k = "__nf_test__"; global.localStorage.setItem(k, "1");
      global.localStorage.removeItem(k); return true;
    } catch (e) { return false; }
  }

  // ── identifier helpers (phone OR email) ──────────────────────────────────
  function digits(s) { return String(s == null ? "" : s).replace(/\D/g, ""); }
  function last10(s) { var d = digits(s); return d.length > 10 ? d.slice(-10) : d; }
  function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim()); }

  function classifyIdentifier(raw) {
    var v = String(raw || "").trim();
    if (!v) return { valid: false };
    if (isEmail(v)) return { valid: true, type: "email", value: v.toLowerCase() };
    var d = digits(v);
    if (d.length >= 10) return { valid: true, type: "phone", value: last10(v) };
    return { valid: false };
  }

  function genCustomerId() {
    return "CUST-" + Date.now().toString(36).toUpperCase() +
           "-" + Math.floor(100 + Math.random() * 900);
  }

  // ── customer store ───────────────────────────────────────────────────────
  function getAllCustomers()      { return readJSON(CUSTOMERS_KEY, []) || []; }
  function saveAllCustomers(list) { return writeJSON(CUSTOMERS_KEY, list); }

  function findCustomerByIdentifier(raw) {
    var id = classifyIdentifier(raw);
    if (!id.valid) return null;
    var all = getAllCustomers();
    for (var i = 0; i < all.length; i++) {
      var c = all[i];
      if (id.type === "email" && c.email && c.email.toLowerCase() === id.value) return c;
      if (id.type === "phone" && last10(c.phone) === id.value) return c;
    }
    return null;
  }
  function findCustomerById(customerId) {
    if (!customerId) return null;
    var all = getAllCustomers();
    for (var i = 0; i < all.length; i++) {
      if (all[i].customerId === customerId) return all[i];
    }
    return null;
  }

  function blankProfile(identifier) {
    var id = classifyIdentifier(identifier);
    var now = new Date().toISOString();
    return {
      customerId: genCustomerId(),
      name:  "",
      phone: id.type === "phone" ? id.value : "",
      email: id.type === "email" ? id.value : "",
      defaultAddress: {
        addressLine1: "", addressLine2: "",
        city: "", state: "", pincode: "", country: "India"
      },
      createdAt: now,
      updatedAt: now,
      marketingConsent: false,
      source: "website_local_account",
      // TODO[shopify]: map to the Shopify Customer ID once Customer Accounts
      // are connected. Never store Admin API tokens or secrets here.
      shopifyCustomerId: null
    };
  }

  // ── session ──────────────────────────────────────────────────────────────
  function getSession()      { return readJSON(SESSION_KEY, null); }
  function setSession(obj)   { return writeJSON(SESSION_KEY, obj); }

  function getCurrentCustomer() {
    var id = readJSON(CURRENT_KEY, null);
    if (!id) return null;
    // CURRENT_KEY stores the customerId string.
    return findCustomerById(typeof id === "string" ? id : (id && id.customerId));
  }
  function isCustomerLoggedIn() { return !!getCurrentCustomer(); }

  function setCurrent(customer) {
    if (!customer) return removeKey(CURRENT_KEY);
    return writeJSON(CURRENT_KEY, customer.customerId);
  }

  // ── mock login (NO real OTP) ─────────────────────────────────────────────
  function startMockLogin(identifier) {
    if (!storageAvailable()) {
      return { success: false, error: "storage_unavailable",
        message: "Your browser is blocking local storage, so accounts can't be used right now." };
    }
    var id = classifyIdentifier(identifier);
    if (!id.valid) {
      return { success: false, error: "invalid_identifier",
        message: "Please enter a valid phone number or email." };
    }
    setSession({ identifier: id.value, type: id.type, status: "otp_sent",
                 startedAt: new Date().toISOString() });
    // TODO[auth]: here you would call your OTP provider to actually send a code.
    return { success: true, demo: true, otpHint: DEMO_OTP,
      message: "For now, this is a local demo account. Real OTP will be connected later." };
  }

  function verifyMockOtp(identifier, otp) {
    var id = classifyIdentifier(identifier);
    if (!id.valid) {
      return { success: false, error: "invalid_identifier",
        message: "Please enter a valid phone number or email." };
    }
    if (String(otp || "").trim() !== DEMO_OTP) {
      return { success: false, error: "invalid_otp",
        message: "Invalid OTP. For this demo, use " + DEMO_OTP + "." };
    }
    var customer = findCustomerByIdentifier(identifier);
    if (!customer) {
      customer = blankProfile(identifier);
      var all = getAllCustomers();
      all.push(customer);
      if (!saveAllCustomers(all)) {
        return { success: false, error: "save_failed",
          message: "We couldn't create your account on this device. Please try again." };
      }
    }
    setCurrent(customer);
    setSession({ identifier: id.value, type: id.type, status: "logged_in",
                 loggedInAt: new Date().toISOString() });
    // Analytics (Upgrade 10) — safe + guarded.
    if (global.OperationsService) {
      try { global.OperationsService.recordAnalyticsEvent("account_login", { customerId: customer.customerId }); } catch (e) {}
    }
    return { success: true, customer: customer };
  }

  // ── profile / address updates ────────────────────────────────────────────
  function persistCustomer(updated) {
    updated.updatedAt = new Date().toISOString();
    var all = getAllCustomers();
    var found = false;
    for (var i = 0; i < all.length; i++) {
      if (all[i].customerId === updated.customerId) { all[i] = updated; found = true; break; }
    }
    if (!found) all.push(updated);
    if (!saveAllCustomers(all)) {
      return { success: false, error: "save_failed",
        message: "Could not save your details on this device. Please try again." };
    }
    return { success: true, customer: updated };
  }

  function createOrUpdateCustomer(profileData) {
    profileData = profileData || {};
    var target = profileData.customerId ? findCustomerById(profileData.customerId)
                                        : getCurrentCustomer();
    if (!target) {
      // Create a fresh profile if we have at least one identifier.
      var ident = profileData.email || profileData.phone;
      if (!ident) return { success: false, error: "account_not_found",
        message: "No account to update. Please log in first." };
      target = blankProfile(ident);
    }
    if (profileData.name  != null) target.name  = String(profileData.name).trim();
    if (profileData.phone != null) target.phone = String(profileData.phone).trim();
    if (profileData.email != null) target.email = String(profileData.email).trim();
    if (profileData.marketingConsent != null) target.marketingConsent = !!profileData.marketingConsent;
    if (profileData.defaultAddress) {
      target.defaultAddress = Object.assign(
        { addressLine1: "", addressLine2: "", city: "", state: "", pincode: "", country: "India" },
        target.defaultAddress || {}, profileData.defaultAddress);
    }
    var res = persistCustomer(target);
    if (res.success && getCurrentCustomer() &&
        getCurrentCustomer().customerId === target.customerId) {
      setCurrent(target);
    }
    return res;
  }

  function updateCustomerAddress(addressData) {
    var cust = getCurrentCustomer();
    if (!cust) return { success: false, error: "not_logged_in",
      message: "Please log in to save an address." };
    cust.defaultAddress = Object.assign(
      { addressLine1: "", addressLine2: "", city: "", state: "", pincode: "", country: "India" },
      cust.defaultAddress || {}, addressData || {});
    return persistCustomer(cust);
  }

  function logoutCustomer() {
    removeKey(CURRENT_KEY);
    setSession({ status: "logged_out", at: new Date().toISOString() });
    return { success: true };
  }

  // ── orders ───────────────────────────────────────────────────────────────
  function getAllOrders() { return readJSON(ORDERS_KEY, []) || []; }

  function getCustomerOrders() {
    var cust = getCurrentCustomer();
    if (!cust) return [];
    var all = getAllOrders();
    var seen = {};
    var result = [];
    all.forEach(function (o) {
      var match =
        (o.customerId && o.customerId === cust.customerId) ||
        (cust.email && o.customer && o.customer.email &&
          o.customer.email.toLowerCase() === cust.email.toLowerCase()) ||
        (cust.phone && o.customer && last10(o.customer.phone) === last10(cust.phone));
      if (match && !seen[o.orderId]) { seen[o.orderId] = true; result.push(o); }
    });
    return result;   // already newest-first (orders are unshifted on create)
  }

  function attachOrderToCustomer(orderId, customerIdentifier) {
    if (!orderId) return { success: false, error: "missing_order_id" };
    var cust = customerIdentifier ? findCustomerByIdentifier(customerIdentifier)
                                  : getCurrentCustomer();
    if (!cust) return { success: false, error: "account_not_found" };
    var all = getAllOrders();
    var changed = false;
    for (var i = 0; i < all.length; i++) {
      if (String(all[i].orderId).toUpperCase() === String(orderId).toUpperCase()) {
        all[i].customerId = cust.customerId;
        all[i].customerSnapshot = all[i].customerSnapshot ||
          { name: cust.name, phone: cust.phone, email: cust.email };
        changed = true;
        break;
      }
    }
    if (changed) writeJSON(ORDERS_KEY, all);
    return { success: changed, customerId: cust.customerId };
  }

  // ── checkout prefill bridge ──────────────────────────────────────────────
  function getSavedCheckoutDetails() {
    var c = getCurrentCustomer();
    if (!c) return null;
    var a = c.defaultAddress || {};
    return {
      name:  c.name  || "",
      phone: c.phone || "",
      email: c.email || "",
      addr1: a.addressLine1 || "",
      addr2: a.addressLine2 || "",
      city:  a.city || "",
      state: a.state || "",
      pin:   a.pincode || ""
    };
  }

  // Persist checkout-form details back onto the logged-in profile (so the next
  // order is even faster). `details` uses the shipping form's field names.
  function saveCheckoutDetailsFromCustomer(details) {
    details = details || {};
    if (!isCustomerLoggedIn()) return { success: false, error: "not_logged_in" };
    createOrUpdateCustomer({
      name: details.name, phone: details.phone, email: details.email
    });
    return updateCustomerAddress({
      addressLine1: details.addr1, addressLine2: details.addr2,
      city: details.city, state: details.state, pincode: details.pin
    });
  }

  // ── header "Account / My Account" link (injected; no per-page edits) ──────
  function renderAccountNav() {
    var loggedIn = isCustomerLoggedIn();
    var deskLabel = loggedIn ? "MY ACCOUNT" : "ACCOUNT";
    var mobLabel  = loggedIn ? "My Account" : "Account";

    // Desktop nav row
    var navRow = document.querySelector(".nf-nav-row");
    if (navRow) {
      var link = navRow.querySelector("[data-account-nav]");
      if (!link) {
        link = document.createElement("a");
        link.className = "nf-nav-link";
        link.setAttribute("data-account-nav", "");
        link.href = nfPath("/pages/account/account.html");
        navRow.appendChild(link);
      }
      link.textContent = deskLabel;
    }

    // Mobile drawer
    var drawer = document.querySelector(".nf-drawer-nav");
    if (drawer) {
      var dlink = drawer.querySelector("[data-account-drawer]");
      if (!dlink) {
        dlink = document.createElement("a");
        dlink.className = "nf-drawer-link";
        dlink.setAttribute("data-account-drawer", "");
        dlink.href = nfPath("/pages/account/account.html");
        drawer.appendChild(dlink);
      }
      dlink.textContent = mobLabel;
    }

    // Repoint any existing person-icon button to the account page.
    var iconBtns = document.querySelectorAll(".nf-account-btn");
    for (var i = 0; i < iconBtns.length; i++) {
      iconBtns[i].setAttribute("href", nfPath("/pages/account/account.html"));
      iconBtns[i].setAttribute("aria-label", loggedIn ? "My Account" : "Account");
    }
  }

  // ── expose ───────────────────────────────────────────────────────────────
  global.CustomerService = {
    getCurrentCustomer:            getCurrentCustomer,
    isCustomerLoggedIn:            isCustomerLoggedIn,
    startMockLogin:                startMockLogin,
    verifyMockOtp:                 verifyMockOtp,
    createOrUpdateCustomer:        createOrUpdateCustomer,
    updateCustomerAddress:         updateCustomerAddress,
    logoutCustomer:                logoutCustomer,
    getCustomerOrders:             getCustomerOrders,
    getAllCustomers:               getAllCustomers,   // Upgrade 10: ops dashboard
    attachOrderToCustomer:         attachOrderToCustomer,
    getSavedCheckoutDetails:       getSavedCheckoutDetails,
    saveCheckoutDetailsFromCustomer: saveCheckoutDetailsFromCustomer,
    renderAccountNav:              renderAccountNav
  };

  // Inject the Account link on every page that includes this file.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAccountNav);
  } else {
    renderAccountNav();
  }
})(window);
