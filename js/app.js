// Nafume Artisan Luxe - Global UI & Interactive Logic (js/app.js)

document.addEventListener("DOMContentLoaded", () => {
    // 1. Initial State Sync
    updateCartUI();
    updateWishlistUI();
    initGlobalEventListeners();
    initHeaderScroll();
    initAccordions();
    initNewsletterForm();
    initTrackOrder();
    initBespokeForm();
});

// 2. Global Drawer Controls
let isSearchOpen = false;
let isMobileMenuOpen = false;
let isCartOpen = false;

function toggleSearch(forceClose = false) {
    const searchDrawer = document.getElementById("search-drawer");
    const overlay = document.getElementById("search-overlay");
    if (!searchDrawer || !overlay) return;

    if (forceClose || isSearchOpen) {
        isSearchOpen = false;
        searchDrawer.classList.add("translate-x-full");
        overlay.classList.add("opacity-0");
        setTimeout(() => overlay.classList.add("hidden"), 400);
        document.body.style.overflow = "";
    } else {
        isSearchOpen = true;
        // Close other drawers
        toggleMobileMenu(true);
        toggleCart(true);

        overlay.classList.remove("hidden");
        setTimeout(() => {
            overlay.classList.remove("opacity-0");
            searchDrawer.classList.remove("translate-x-full");
        }, 10);
        document.body.style.overflow = "hidden";
        // Auto-focus search input
        const searchInput = searchDrawer.querySelector("input");
        if (searchInput) searchInput.focus();
    }
}

function toggleMobileMenu(forceClose = false) {
    const mobileDrawer = document.getElementById("mobile-drawer");
    const overlay = document.getElementById("mobile-menu-overlay");
    if (!mobileDrawer || !overlay) return;

    if (forceClose || isMobileMenuOpen) {
        isMobileMenuOpen = false;
        mobileDrawer.classList.add("-translate-x-full");
        overlay.classList.add("opacity-0");
        setTimeout(() => overlay.classList.add("hidden"), 400);
        document.body.style.overflow = "";
    } else {
        isMobileMenuOpen = true;
        // Close others
        toggleSearch(true);
        toggleCart(true);

        overlay.classList.remove("hidden");
        setTimeout(() => {
            overlay.classList.remove("opacity-0");
            mobileDrawer.classList.remove("-translate-x-full");
        }, 10);
        document.body.style.overflow = "hidden";
    }
}

function toggleCart(forceClose = false) {
    const cartDrawer = document.getElementById("cart-drawer");
    const overlay = document.getElementById("cart-overlay");
    if (!cartDrawer || !overlay) return;

    if (forceClose || isCartOpen) {
        isCartOpen = false;
        cartDrawer.classList.add("translate-x-full");
        overlay.classList.add("opacity-0");
        setTimeout(() => overlay.classList.add("hidden"), 400);
        document.body.style.overflow = "";
    } else {
        isCartOpen = true;
        // Close others
        toggleSearch(true);
        toggleMobileMenu(true);

        overlay.classList.remove("hidden");
        setTimeout(() => {
            overlay.classList.remove("opacity-0");
            cartDrawer.classList.remove("translate-x-full");
        }, 10);
        document.body.style.overflow = "hidden";
        updateCartUI(); // Refresh items
    }
}

// 3. Dynamic Cart UI Synchronization
function updateCartUI() {
    const cartCountBadges = document.querySelectorAll(".cart-count");
    const cartCountVal = window.stateManager.getCartCount();
    
    // Update badge counts across all headers/menus
    cartCountBadges.forEach(badge => {
        badge.textContent = cartCountVal;
        if (cartCountVal === 0) {
            badge.classList.add("hidden");
        } else {
            badge.classList.remove("hidden");
        }
    });

    // Populate Cart Drawer contents
    const cartContainer = document.getElementById("cart-drawer-items");
    const cartSubtotalEl = document.getElementById("cart-drawer-subtotal");
    const cartGrandTotalEl = document.getElementById("cart-drawer-grandtotal");
    const cartCheckoutBtn = document.getElementById("cart-drawer-checkout-btn");

    if (!cartContainer) return;

    const cartItems = window.stateManager.cart;

    if (cartItems.length === 0) {
        cartContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 text-center px-6 animate-fade-in">
                <span class="material-symbols-outlined text-4xl text-accent-bronze mb-4 animate-pulse">explore</span>
                <h4 class="font-headline-sm text-headline-sm text-primary mb-2">Your Scent Library is Empty</h4>
                <p class="font-body-md text-text-secondary mb-8 text-xs max-w-xs leading-relaxed">
                    Begin your olfactory exploration by browsing our bestseller catalog or starting the interactive fragrance matchmaking quiz.
                </p>
                <div class="flex flex-col gap-3 w-full max-w-[240px]">
                    <a href="/pages/collections/shop" class="w-full inline-flex justify-center items-center py-3 bg-primary text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#222] transition-colors text-center" onclick="toggleCart(true)">Shop Bestsellers</a>
                    <a href="/pages/collections/collections" class="w-full inline-flex justify-center items-center py-3 bg-transparent border border-primary text-primary text-[10px] font-semibold uppercase tracking-widest hover:bg-primary hover:text-white transition-all text-center" onclick="toggleCart(true)">Browse Collections</a>
                </div>
            </div>
        `;
        if (cartSubtotalEl) cartSubtotalEl.textContent = "₹0";
        if (cartGrandTotalEl) cartGrandTotalEl.textContent = "₹0";
        if (cartCheckoutBtn) {
            cartCheckoutBtn.classList.add("pointer-events-none", "opacity-50");
        }
        return;
    }

    if (cartCheckoutBtn) {
        cartCheckoutBtn.classList.remove("pointer-events-none", "opacity-50");
    }

    // A. Free Shipping Progress Bar (High E-Commerce Conversion Feature)
    const shipStatus = window.stateManager.getFreeShippingStatus();
    let shippingProgressHtml = "";
    if (shipStatus.eligible) {
        shippingProgressHtml = `
            <div class="bg-success-soft/10 text-success-soft p-3 rounded text-[10px] font-semibold uppercase tracking-widest flex items-center gap-2 mb-4 animate-fade-in">
                <span class="material-symbols-outlined text-[16px] text-success-soft">verified</span>
                You qualify for Free Express Shipping!
            </div>
        `;
    } else {
        shippingProgressHtml = `
            <div class="bg-surface-container p-3 rounded mb-4 animate-fade-in text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
                <div class="flex justify-between mb-1.5">
                    <span>Add ₹${shipStatus.remaining.toLocaleString('en-IN')} for Free Shipping</span>
                    <span>${shipStatus.percent}%</span>
                </div>
                <div class="w-full bg-border-muted h-1 rounded overflow-hidden">
                    <div class="bg-accent-bronze h-full transition-all duration-500" style="width: ${shipStatus.percent}%"></div>
                </div>
            </div>
        `;
    }

    let itemsHtml = shippingProgressHtml;
    
    // List individual items
    cartItems.forEach(item => {
        itemsHtml += `
            <div class="flex gap-4 py-4 border-b border-border-muted group items-start animate-fade-in">
                <div class="w-20 h-24 bg-white rounded border border-border-muted overflow-hidden flex-shrink-0">
                    <img src="${item.image}" alt="${item.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                </div>
                <div class="flex-grow flex flex-col min-w-0">
                    <div class="flex justify-between items-start gap-2 mb-1">
                        <h4 class="font-body-md text-body-md font-semibold text-primary truncate leading-tight hover:text-accent-bronze transition-colors">
                            <a href="/pages/products/${item.id}" onclick="toggleCart(true)">${item.name}</a>
                        </h4>
                        <button class="text-on-surface-variant hover:text-error transition-colors flex p-1" onclick="window.stateManager.removeFromCart('${item.id}', '${item.size}')" aria-label="Remove item">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </div>
                    <p class="text-label-sm font-label-sm text-accent-bronze uppercase tracking-widest mb-2">${item.size} / Eau de Parfum</p>
                    <div class="flex justify-between items-center mt-auto">
                        <div class="flex items-center border border-border-muted bg-white">
                            <button class="px-2 py-1 text-primary hover:bg-surface-container transition-colors text-sm font-semibold" onclick="window.stateManager.updateCartQty('${item.id}', '${item.size}', ${item.qty - 1})">-</button>
                            <span class="px-3 text-label-sm font-label-sm text-primary font-bold">${item.qty}</span>
                            <button class="px-2 py-1 text-primary hover:bg-surface-container transition-colors text-sm font-semibold" onclick="window.stateManager.updateCartQty('${item.id}', '${item.size}', ${item.qty + 1})">+</button>
                        </div>
                        <span class="text-body-md font-body-md text-primary font-semibold">₹${(item.price * item.qty).toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>
        `;
    });

    // B. Discovery Set Upsell recommendation (AOV Booster)
    const isDiscoverySetInCart = cartItems.some(i => i.id === 'discovery-set');
    if (!isDiscoverySetInCart) {
        itemsHtml += `
            <div class="mt-6 border border-accent-bronze/20 bg-surface-container/30 p-4 rounded animate-fade-in">
                <span class="text-[9px] font-semibold text-accent-bronze uppercase tracking-widest block mb-1">Olfactory Exploration Add-on</span>
                <h4 class="font-bold text-sm text-primary mb-1">Add The Discovery Box</h4>
                <p class="text-[10px] text-text-secondary leading-relaxed font-light mb-3">Sample 5 signature scents for just ₹999. Fully redeemable as store credit!</p>
                <button class="w-full py-2.5 bg-transparent border border-primary text-primary hover:bg-primary hover:text-white transition-colors text-[10px] font-semibold uppercase tracking-widest" onclick="window.stateManager.addToCart('discovery-set', '50ml', 1)">
                    + Add to Cart (₹999)
                </button>
            </div>
        `;
    }

    cartContainer.innerHTML = itemsHtml;
    
    const totals = window.stateManager.getCartTotals();
    if (cartSubtotalEl) cartSubtotalEl.textContent = "₹" + totals.subtotal.toLocaleString('en-IN');
    if (cartGrandTotalEl) cartGrandTotalEl.textContent = "₹" + totals.total.toLocaleString('en-IN');
}

// 4. Wishlist UI Sync
function updateWishlistUI() {
    const wishlistCountBadges = document.querySelectorAll(".wishlist-count");
    const wishlistItems = window.stateManager.getWishlist();
    
    wishlistCountBadges.forEach(badge => {
        badge.textContent = wishlistItems.length;
        if (wishlistItems.length === 0) {
            badge.classList.add("hidden");
        } else {
            badge.classList.remove("hidden");
        }
    });

    // Populate active heart states on current catalog items
    document.querySelectorAll(".wishlist-btn-toggle").forEach(btn => {
        const pId = btn.dataset.productId;
        const icon = btn.querySelector(".material-symbols-outlined");
        if (pId && icon) {
            if (window.stateManager.isInWishlist(pId)) {
                icon.textContent = "favorite";
                icon.classList.add("icon-fill", "text-error");
            } else {
                icon.textContent = "favorite";
                icon.classList.remove("icon-fill", "text-error");
            }
        }
    });
}

// 5. Global Event Binding (Drawers, Click Catchers)
function initGlobalEventListeners() {
    // Listen to global State custom events
    window.addEventListener("cartUpdated", () => {
        updateCartUI();
    });

    window.addEventListener("wishlistUpdated", () => {
        updateWishlistUI();
    });

    // Live Search Drawer Keypress Matching
    const searchInput = document.querySelector("#search-drawer input");
    const searchResultsContainer = document.querySelector("#search-drawer .space-y-4");

    if (searchInput && searchResultsContainer) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (query.length < 2) {
                // Restore default suggestion items (Vanilla Wood standard)
                searchResultsContainer.innerHTML = `
                    <a class="flex gap-4 items-center group hover:bg-surface-variant p-2 rounded transition-colors -ml-2" href="/pages/collections/shop">
                        <div class="w-16 h-20 bg-surface-container rounded overflow-hidden flex-shrink-0">
                            <img alt="Vanilla Smoke" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDEodOsItWYqQZbxIAZYjLEgWC7RCYEkMQp-beWTFnXha8tRyJp2MLkHFYFvhACsRFE9z3TnWzbg3rka-zFxL3wbvV0_IBZ8Z6DTdJopHr6erhjPn7vKqQrLC2X25Nxzg_mtzFdzNLVnSXyPQHjjcDjfyOxnDIE0hPi9BYoo9tvm-h6wXEzr_yEyaqRvksyPDC2YVqEvRPLkx-6OdUoqbOHoLro-3RrBOQP6GO3SG6ATn84Gzuypj-FfW4LedcKIgg6tqRJgO_Rj08y"/>
                        </div>
                        <div>
                            <h4 class="text-body-md font-body-md text-primary mb-1 group-hover:text-accent-bronze transition-colors">Vanilla Smoke</h4>
                            <p class="text-label-sm font-label-sm text-on-surface-variant">₹1,699</p>
                        </div>
                    </a>
                `;
                return;
            }

            const allProducts = window.stateManager.getAllProducts();
            
            const bestForTags = {
                "italian-bloom": ["evening wear", "date night", "summer freshness"],
                "mystical-oud": ["evening wear", "date night", "winter depth"],
                "vanilla-smoke": ["intimate dinners", "cozy evenings", "date night"],
                "aqua-noir": ["office luxury", "active mornings", "summer freshness"],
                "sacred-ash": ["ceremonial rituals", "kyoto stillness", "evening luxury"],
                "velvet-moss": ["earthy mornings", "office luxury", "daytime freshness"],
                "noir-fig": ["intimate evenings", "date night", "sensual nights"],
                "solar-neroli": ["bright mornings", "summer freshness", "gifting"],
                "discovery-set": ["olfactory exploration", "premium gift", "scent testing"]
            };

            const matched = allProducts.filter(p => {
                const tags = bestForTags[p.id] || [];
                const tagsMatch = tags.some(t => t.includes(query));
                return p.name.toLowerCase().includes(query) || 
                       p.family.toLowerCase().includes(query) || 
                       p.tagline.toLowerCase().includes(query) || 
                       (p.topNotes && p.topNotes.toLowerCase().includes(query)) ||
                       (p.heartNotes && p.heartNotes.toLowerCase().includes(query)) ||
                       (p.baseNotes && p.baseNotes.toLowerCase().includes(query)) ||
                       tagsMatch;
            });

            if (matched.length === 0) {
                searchResultsContainer.innerHTML = `
                    <div class="py-8 text-center text-text-secondary text-xs select-none">
                        No matching scent found. <br/><span class="text-[10px] font-semibold text-accent-bronze uppercase tracking-widest mt-2 block">Try woody, floral, oud, fresh, vanilla, or citrus</span>
                    </div>
                `;
                return;
            }

            let resultsHtml = "";
            matched.forEach(p => {
                resultsHtml += `
                    <a class="flex gap-4 items-center group hover:bg-surface-variant p-2 rounded transition-colors -ml-2" href="/pages/products/${p.id}" onclick="toggleSearch(true)">
                        <div class="w-16 h-20 bg-surface-container rounded border border-border-muted overflow-hidden flex-shrink-0">
                            <img alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${p.image}"/>
                        </div>
                        <div class="min-w-0 flex-grow">
                            <h4 class="text-body-md font-body-md text-primary truncate mb-1 group-hover:text-accent-bronze transition-colors">${p.name}</h4>
                            <p class="text-label-sm font-label-sm text-on-surface-variant">₹${p.price50ml.toLocaleString('en-IN')}</p>
                        </div>
                    </a>
                `;
            });
            searchResultsContainer.innerHTML = resultsHtml;
        });
    }

    // Dynamic click binding on Quick Add catalog elements
    document.addEventListener("click", (e) => {
        const quickAddBtn = e.target.closest(".quick-add-btn");
        if (quickAddBtn) {
            e.preventDefault();
            const pId = quickAddBtn.dataset.productId;
            const size = quickAddBtn.dataset.productSize || "50ml";
            if (pId) {
                window.stateManager.addToCart(pId, size, 1);
                toggleCart(false); // slide open the cart drawer!
            }
        }

        const wishlistToggle = e.target.closest(".wishlist-btn-toggle");
        if (wishlistToggle) {
            e.preventDefault();
            const pId = wishlistToggle.dataset.productId;
            if (pId) {
                const isSaved = window.stateManager.toggleWishlist(pId);
                // Subtle overlay prompt
                showSubtleToast(isSaved ? "Saved to your Wishlist" : "Removed from Wishlist");
            }
        }
    });
}

// 6. Sticky Header Transition on Scroll
function initHeaderScroll() {
    const headers = document.querySelectorAll("#main-header, #top-nav");
    if (headers.length === 0) return;

    window.addEventListener("scroll", () => {
        if (window.scrollY > 20) {
            headers.forEach(h => h.classList.add("header-scrolled", "shadow-sm"));
        } else {
            headers.forEach(h => h.classList.remove("header-scrolled", "shadow-sm"));
        }
    });
}

// 7. Accordion Dropdown Controls
function initAccordions() {
    // Capture accordion triggers
    document.addEventListener("click", (e) => {
        const trigger = e.target.closest(".accordion-trigger");
        if (!trigger) return;

        const accordionItem = trigger.closest(".accordion-item");
        if (!accordionItem) return;

        const isCurrentlyActive = accordionItem.classList.contains("active");

        // Close siblings if inside a strict list
        const parentList = trigger.closest(".accordion-list");
        if (parentList) {
            parentList.querySelectorAll(".accordion-item").forEach(item => {
                item.classList.remove("active");
            });
        }

        if (!isCurrentlyActive) {
            accordionItem.classList.add("active");
        } else {
            accordionItem.classList.remove("active");
        }
    });
}

// 8. Support / FAQ Search & Toggles
function toggleFaq(button) {
    const item = button.parentElement;
    if (!item) return;

    const isActive = item.classList.contains("active");
    
    // Close siblings
    const siblings = item.parentElement.querySelectorAll(".faq-item");
    siblings.forEach(sib => sib.classList.remove("active"));

    if (!isActive) {
        item.classList.add("active");
    }
}

// 9. Newsletter success mock
function initNewsletterForm() {
    const forms = document.querySelectorAll("footer form, .newsletter-section form");
    forms.forEach(form => {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const input = form.querySelector("input[type='email']");
            if (input && input.value.trim() !== "") {
                const parent = form.parentElement;
                parent.innerHTML = `
                    <div class="text-accent-bronze font-body-md text-sm mt-2 animate-fade-in flex items-center gap-2">
                        <span class="material-symbols-outlined text-[18px]">verified</span>
                        Welcome to the Nafume Club. Check your inbox soon.
                    </div>
                `;
            }
        });
    });
}

// 10. Track Order page mock
function initTrackOrder() {
    const trackForm = document.getElementById("track-order-form");
    const resultBox = document.getElementById("track-results-box");
    if (!trackForm || !resultBox) return;

    trackForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const orderNoInput = trackForm.querySelector("input").value.trim();
        
        if (orderNoInput === "") return;

        // Dynamic lookup from localStorage orders
        let order = window.stateManager.getOrder(orderNoInput);
        
        let detailsHtml = "";
        
        if (order) {
            let paymentPrefText = "";
            if (order.paymentPreference === "upi") {
                paymentPrefText = "Instant UPI Transfer";
            } else if (order.paymentPreference === "razorpay") {
                paymentPrefText = "Razorpay Payment Link";
            } else if (order.paymentPreference === "cod") {
                paymentPrefText = "Cash on Delivery";
            } else {
                paymentPrefText = "Manual WhatsApp Confirmation";
            }

            // Generate real vertical timeline based on order status
            detailsHtml = `
                <div class="border border-border-muted p-6 bg-white rounded animate-fade-in text-left">
                    <div class="flex justify-between items-start border-b border-border-muted pb-4 mb-6">
                        <div>
                            <p class="text-label-sm font-label-sm text-text-secondary uppercase">Order Tracked</p>
                            <h3 class="font-headline-sm text-headline-sm text-primary font-semibold">${order.orderNumber}</h3>
                            <p class="text-xs text-text-secondary mt-1"><strong>Customer:</strong> ${order.shippingDetails.firstName} ${order.shippingDetails.lastName}</p>
                            <p class="text-xs text-text-secondary"><strong>Grand Total:</strong> ₹${order.totals.total.toLocaleString('en-IN')}</p>
                        </div>
                        <span class="bg-[#fff3e0] text-[#ef6c00] px-3 py-1 text-[10px] font-label-sm uppercase tracking-widest font-bold">Pending WhatsApp</span>
                    </div>
                    <div class="space-y-6 relative pl-6 border-l border-border-muted ml-3">
                        <!-- Step 1 -->
                        <div class="relative">
                            <span class="absolute -left-9 top-1 w-6 h-6 rounded-full bg-primary text-white text-[12px] flex items-center justify-center font-bold">✓</span>
                            <h4 class="font-body-md text-body-md font-semibold text-primary">Order Request Prepared</h4>
                            <p class="text-label-sm font-label-sm text-text-secondary">Your bespoke scent selection was reserved on ${order.date}.</p>
                        </div>
                        <!-- Step 2 -->
                        <div class="relative">
                            <span class="absolute -left-9 top-1 w-6 h-6 rounded-full bg-accent-bronze text-white text-[12px] flex items-center justify-center font-bold">→</span>
                            <h4 class="font-body-md text-body-md font-semibold text-accent-bronze">WhatsApp Confirmation Pending</h4>
                            <p class="text-label-sm font-label-sm text-text-secondary">Concierge is waiting for your WhatsApp receipt confirmation. Please launch the chat to secure availability.</p>
                        </div>
                        <!-- Step 3 -->
                        <div class="relative opacity-40">
                            <span class="absolute -left-9 top-1 w-6 h-6 rounded-full bg-surface-variant text-text-secondary text-[12px] flex items-center justify-center">○</span>
                            <h4 class="font-body-md text-body-md font-semibold text-primary">Payment Confirmation</h4>
                            <p class="text-label-sm font-label-sm text-text-secondary">Verifying secure ${paymentPrefText} transaction details.</p>
                        </div>
                        <!-- Step 4 -->
                        <div class="relative opacity-40">
                            <span class="absolute -left-9 top-1 w-6 h-6 rounded-full bg-surface-variant text-text-secondary text-[12px] flex items-center justify-center">○</span>
                            <h4 class="font-body-md text-body-md font-semibold text-primary">Blending & Packing</h4>
                            <p class="text-label-sm font-label-sm text-text-secondary">Olfactory maturing process & luxury craft box safety wax sealing.</p>
                        </div>
                        <!-- Step 5 -->
                        <div class="relative opacity-40">
                            <span class="absolute -left-9 top-1 w-6 h-6 rounded-full bg-surface-variant text-text-secondary text-[12px] flex items-center justify-center">○</span>
                            <h4 class="font-body-md text-body-md font-semibold text-primary">Shipped</h4>
                            <p class="text-label-sm font-label-sm text-text-secondary">Handed to priority express logistics (BlueDart Express).</p>
                        </div>
                        <!-- Step 6 -->
                        <div class="relative opacity-40">
                            <span class="absolute -left-9 top-1 w-6 h-6 rounded-full bg-surface-variant text-text-secondary text-[12px] flex items-center justify-center">○</span>
                            <h4 class="font-body-md text-body-md font-semibold text-primary">Delivered</h4>
                            <p class="text-label-sm font-label-sm text-text-secondary">Package handed over with secure threshold checks.</p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Standard fallback mock tracking details for any other input (Manual typed tracking fallback)
            detailsHtml = `
                <div class="border border-border-muted p-6 bg-white rounded animate-fade-in text-left">
                    <div class="flex justify-between items-start border-b border-border-muted pb-4 mb-6">
                        <div>
                            <p class="text-label-sm font-label-sm text-text-secondary uppercase">Order Dispatched</p>
                            <h3 class="font-headline-sm text-headline-sm text-primary font-semibold">${orderNoInput}</h3>
                            <p class="text-xs text-text-secondary mt-1"><strong>Status:</strong> Active in Logistics</p>
                        </div>
                        <span class="bg-[#e8f5e9] text-[#2e7d32] px-3 py-1 text-[10px] font-label-sm uppercase tracking-widest font-bold">Blending</span>
                    </div>
                    <div class="space-y-6 relative pl-6 border-l border-border-muted ml-3">
                        <div class="relative">
                            <span class="absolute -left-9 top-1 w-6 h-6 rounded-full bg-primary text-white text-[12px] flex items-center justify-center font-bold">✓</span>
                            <h4 class="font-body-md text-body-md font-semibold text-primary">Order Request Prepared</h4>
                            <p class="text-label-sm font-label-sm text-text-secondary">Artisan scent catalog items successfully reserved.</p>
                        </div>
                        <div class="relative">
                            <span class="absolute -left-9 top-1 w-6 h-6 rounded-full bg-primary text-white text-[12px] flex items-center justify-center font-bold">✓</span>
                            <h4 class="font-body-md text-body-md font-semibold text-primary">WhatsApp Confirmation Pending</h4>
                            <p class="text-label-sm font-label-sm text-text-secondary">Bespoke order captured & WhatsApp receipt logs verified.</p>
                        </div>
                        <div class="relative">
                            <span class="absolute -left-9 top-1 w-6 h-6 rounded-full bg-primary text-white text-[12px] flex items-center justify-center font-bold">✓</span>
                            <h4 class="font-body-md text-body-md font-semibold text-primary">Payment Confirmation</h4>
                            <p class="text-label-sm font-label-sm text-text-secondary">Payment settled via prepaid confirmation logs.</p>
                        </div>
                        <div class="relative">
                            <span class="absolute -left-9 top-1 w-6 h-6 rounded-full bg-accent-bronze text-white text-[12px] flex items-center justify-center font-bold">→</span>
                            <h4 class="font-body-md text-body-md font-semibold text-accent-bronze">Blending & Packing</h4>
                            <p class="text-label-sm font-label-sm text-text-secondary">Olfactory balancing & custom maturation active at blenders lab.</p>
                        </div>
                        <div class="relative opacity-40">
                            <span class="absolute -left-9 top-1 w-6 h-6 rounded-full bg-surface-variant text-text-secondary text-[12px] flex items-center justify-center">○</span>
                            <h4 class="font-body-md text-body-md font-semibold text-primary">Shipped</h4>
                            <p class="text-label-sm font-label-sm text-text-secondary">Insured courier dispatch timeline.</p>
                        </div>
                        <div class="relative opacity-40">
                            <span class="absolute -left-9 top-1 w-6 h-6 rounded-full bg-surface-variant text-text-secondary text-[12px] flex items-center justify-center">○</span>
                            <h4 class="font-body-md text-body-md font-semibold text-primary">Delivered</h4>
                            <p class="text-label-sm font-label-sm text-text-secondary">To secure address.</p>
                        </div>
                    </div>
                </div>
            `;
        }

        resultBox.innerHTML = detailsHtml;
        resultBox.classList.remove("hidden");
    });
}


// 11. Bespoke Consultation Form Booking
function initBespokeForm() {
    const bespokeForm = document.getElementById("bespoke-booking-form");
    if (!bespokeForm) return;

    bespokeForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        // Form validations
        const name = bespokeForm.querySelector("input[type='text']").value.trim();
        const email = bespokeForm.querySelector("input[type='email']").value.trim();

        if (name === "" || email === "") return;

        // Elegant Dynamic success container swap
        bespokeForm.innerHTML = `
            <div class="text-center py-12 px-6 border border-accent-bronze/30 bg-surface-container-lowest animate-fade-in">
                <span class="material-symbols-outlined text-4xl text-accent-bronze mb-4 animate-pulse">hotel_class</span>
                <h3 class="font-headline-sm text-headline-sm text-primary mb-3">Your Request is Confirmed</h3>
                <p class="font-body-lg text-body-lg text-text-secondary max-w-md mx-auto mb-8 text-sm leading-relaxed">
                    Greetings ${name}. A luxury concierge expert from NAFUME Artisan Luxe will connect with you at <strong>${email}</strong> within 24 hours to coordinate your custom blending appointment.
                </p>
                <a href="/pages/collections/shop" class="inline-flex justify-center items-center px-8 py-4 bg-primary text-white text-label-md font-label-md uppercase tracking-widest hover:scale-[1.02] hover:bg-[#222] transition-all">Browse Existing Scents</a>
            </div>
        `;
    });
}

// 12. Helper: Subtle Toast Notification Overlay
function showSubtleToast(message) {
    let toast = document.getElementById("subtle-toast-alert");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "subtle-toast-alert";
        toast.className = "fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-primary text-white px-6 py-3 font-label-sm text-[11px] uppercase tracking-widest z-[300] border border-[#333] transition-all duration-300 opacity-0 pointer-events-none rounded-lg shadow-xl";
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.classList.remove("opacity-0", "translate-y-2");
    
    setTimeout(() => {
        toast.classList.add("opacity-0", "translate-y-2");
    }, 2500);
}
