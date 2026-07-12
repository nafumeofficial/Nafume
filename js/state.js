// Centralized Business Config suitable for WhatsApp Redirection Order Capture
const BUSINESS_CONFIG = {
    brandName: "NAFUME Artisan Luxe",
    whatsappNumber: "91XXXXXXXXXX", // Business capture WhatsApp destination
    currency: "₹",
    freeShippingThreshold: 1500,
    couponCode: "NAFUME10",
    couponDiscount: 10
};
window.BUSINESS_CONFIG = BUSINESS_CONFIG;

// Mirrors the real NAFUME catalog defined in js/launch.js (LAUNCH_PRODUCTS).
// Kept in sync manually since this legacy state module has its own object shape
// (used by the search drawer / account-page cart in js/app.js).
const NAFUME_PRODUCTS = [
    {
        id: "seduction",
        newLaunch: true,
        name: "Seduction",
        tagline: "Sensual & Romantic",
        description: "A deep, captivating scent that commands attention. Seduction opens with bright bergamot and spicy pink pepper before unfolding into a lush heart of Bulgarian rose and jasmine.",
        family: "Floral | Oriental",
        topNotes: "Bergamot, Pink Pepper, Red Berries",
        heartNotes: "Bulgarian Rose, Jasmine, Tuberose",
        baseNotes: "Warm Amber, Sandalwood, Musk",
        price50ml: 799,
        mrp50ml: 1299,
        image: "/assets/images/products/seduction/01.jpg",
        howToUse: "Apply to pulse points — wrists, neck, and behind ears. Best applied right after showering on warm skin for maximum longevity.",
        ingredients: "Premium fragrance oils in a smooth alcohol base. Phthalate-free, triclosan-free, and never tested on animals."
    },
    {
        id: "dark-oud",
        newLaunch: true,
        name: "Dark Oud",
        tagline: "Bold & Mysterious",
        description: "An ode to the ancient art of oud. Dark Oud blends the richness of aged agarwood with dark leather and saffron, creating a fragrance that is both modern and timeless.",
        family: "Woody | Oud",
        topNotes: "Saffron, Black Pepper, Cardamom",
        heartNotes: "Aged Oud, Dark Leather, Rose Absolute",
        baseNotes: "Amber, Frankincense, Patchouli, Vetiver",
        price50ml: 799,
        mrp50ml: 1299,
        image: "/assets/images/products/dark-oud/01.jpg",
        howToUse: "2–3 sprays is all you need. Apply to chest and wrists. The concentration is powerful — less is more.",
        ingredients: "Premium fragrance oils in a smooth alcohol base. Phthalate-free, triclosan-free, and never tested on animals."
    },
    {
        id: "red-spirit",
        newLaunch: true,
        name: "Red Spirit",
        tagline: "Confident & Fiery",
        description: "Red Spirit ignites the senses with a fiery blend of cinnamon and ginger, softened into warmth by cedarwood and tonka bean. A fragrance for those who dare to stand out.",
        family: "Spicy | Aromatic",
        topNotes: "Cinnamon, Ginger, Clove Bud",
        heartNotes: "Cedarwood, Vetiver, Bulgarian Rose",
        baseNotes: "Tonka Bean, Dark Musk, Vanilla",
        price50ml: 799,
        mrp50ml: 1299,
        image: "/assets/images/products/red-spirit/01.jpg",
        howToUse: "Spray 2–3 times on the chest and wrists. The warmth of your pulse points amplifies the spice notes beautifully throughout the day.",
        ingredients: "Premium fragrance oils in a smooth alcohol base. Phthalate-free, triclosan-free, and never tested on animals."
    },
    {
        id: "aqua-manthan",
        newLaunch: true,
        name: "Aqua Manthan",
        tagline: "Fresh & Energetic",
        description: "Aqua Manthan captures the essence of the ocean at dawn — crisp sea air, fresh citrus, and a whisper of green tea. Light enough for everyday wear, distinctive enough to remember.",
        family: "Fresh | Aquatic",
        topNotes: "Sea Salt, Bergamot, Mandarin Orange",
        heartNotes: "Marine Accord, Green Tea, White Jasmine",
        baseNotes: "Cedarwood, Ambergris, Clean Musk",
        price50ml: 799,
        mrp50ml: 1299,
        image: "/assets/images/products/aqua-manthan/01.jpg",
        howToUse: "Spray generously on chest and neck after a shower. The marine accord blooms even more refreshingly in heat.",
        ingredients: "Premium fragrance oils in a smooth alcohol base. Phthalate-free, triclosan-free, and never tested on animals."
    },
    {
        id: "all-day-misfit",
        newLaunch: true,
        name: "All Day",
        tagline: "Warm & Unique",
        description: "All Day is for those who refuse to fit in. A rich blend of dark coffee and cacao on a base of tobacco leaf and warm musk — a fragrance as complex and unpredictable as you are.",
        family: "Gourmand | Woody",
        topNotes: "Dark Coffee, Cacao, Bergamot",
        heartNotes: "Tobacco Leaf, Bourbon Vanilla, Caramel",
        baseNotes: "Sandalwood, Patchouli, Warm Musk",
        price50ml: 799,
        mrp50ml: 1299,
        image: "/assets/images/products/all-day-misfit/01.jpg",
        howToUse: "Apply on pulse points and the back of the neck. The gourmand notes develop beautifully over time — let it breathe and evolve on your skin.",
        ingredients: "Premium fragrance oils in a smooth alcohol base. Phthalate-free, triclosan-free, and never tested on animals."
    }
];

class NafumeStateManager {
    constructor() {
        this.products = NAFUME_PRODUCTS;
        this.config = BUSINESS_CONFIG;
        this.cart = this.loadFromStorage("nafume_cart", []);
        this.wishlist = this.loadFromStorage("nafume_wishlist", []);
        this.coupon = this.loadFromStorage("nafume_coupon", null);
        this.orders = this.loadFromStorage("nafume_orders", []);
    }

    loadFromStorage(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error("Storage load failed", e);
            return defaultValue;
        }
    }

    saveToStorage(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {
            console.error("Storage save failed", e);
        }
    }

    // Product Access
    getAllProducts() {
        return this.products;
    }

    getProductById(id) {
        return this.products.find(p => p.id === id) || null;
    }

    // Wishlist Logic
    toggleWishlist(productId) {
        const index = this.wishlist.indexOf(productId);
        if (index > -1) {
            this.wishlist.splice(index, 1);
        } else {
            this.wishlist.push(productId);
        }
        this.saveToStorage("nafume_wishlist", this.wishlist);
        
        // Dispatch custom event for UI reactivity
        window.dispatchEvent(new CustomEvent("wishlistUpdated", { detail: this.wishlist }));
        return this.isInWishlist(productId);
    }

    isInWishlist(productId) {
        return this.wishlist.includes(productId);
    }

    getWishlist() {
        return this.wishlist;
    }

    // Cart Logic
    addToCart(productId, size = "50ml", qty = 1) {
        const product = this.getProductById(productId);
        if (!product) return;

        const price = size === "100ml" ? product.price100ml : product.price50ml;
        
        const existingIndex = this.cart.findIndex(
            item => item.id === productId && item.size === size
        );

        if (existingIndex > -1) {
            this.cart[existingIndex].qty += qty;
        } else {
            this.cart.push({
                id: productId,
                name: product.name,
                tagline: product.tagline,
                size: size,
                price: price,
                image: product.image,
                qty: qty
            });
        }

        this.saveToStorage("nafume_cart", this.cart);
        window.dispatchEvent(new CustomEvent("cartUpdated", { detail: this.cart }));
    }

    removeFromCart(productId, size) {
        this.cart = this.cart.filter(item => !(item.id === productId && item.size === size));
        this.saveToStorage("nafume_cart", this.cart);
        window.dispatchEvent(new CustomEvent("cartUpdated", { detail: this.cart }));
    }

    updateCartQty(productId, size, qty) {
        const existingIndex = this.cart.findIndex(
            item => item.id === productId && item.size === size
        );

        if (existingIndex > -1) {
            this.cart[existingIndex].qty = parseInt(qty);
            if (this.cart[existingIndex].qty <= 0) {
                this.cart.splice(existingIndex, 1);
            }
            this.saveToStorage("nafume_cart", this.cart);
            window.dispatchEvent(new CustomEvent("cartUpdated", { detail: this.cart }));
        }
    }

    clearCart() {
        this.cart = [];
        this.coupon = null;
        this.saveToStorage("nafume_cart", this.cart);
        this.saveToStorage("nafume_coupon", this.coupon);
        window.dispatchEvent(new CustomEvent("cartUpdated", { detail: this.cart }));
    }

    getCartCount() {
        return this.cart.reduce((total, item) => total + item.qty, 0);
    }

    getCartSubtotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.qty), 0);
    }

    // Coupon handling
    applyCoupon(code) {
        const uppercaseCode = code.trim().toUpperCase();
        if (uppercaseCode === this.config.couponCode) {
            this.coupon = { code: this.config.couponCode, discountPercent: this.config.couponDiscount };
            this.saveToStorage("nafume_coupon", this.coupon);
            window.dispatchEvent(new CustomEvent("cartUpdated", { detail: this.cart }));
            return { success: true, message: `Coupon applied successfully (${this.config.couponDiscount}% Off)!` };
        }
        return { success: false, message: "Invalid discount code." };
    }

    removeCoupon() {
        this.coupon = null;
        this.saveToStorage("nafume_coupon", this.coupon);
        window.dispatchEvent(new CustomEvent("cartUpdated", { detail: this.cart }));
    }

    getDiscountValue() {
        if (!this.coupon) return 0;
        const subtotal = this.getCartSubtotal();
        return Math.round((subtotal * this.coupon.discountPercent) / 100);
    }

    getFreeShippingStatus() {
        const subtotal = this.getCartSubtotal();
        const threshold = this.config.freeShippingThreshold;
        if (subtotal === 0) {
            return { eligible: false, remaining: threshold, percent: 0 };
        }
        if (subtotal >= threshold) {
            return { eligible: true, remaining: 0, percent: 100 };
        }
        return {
            eligible: false,
            remaining: threshold - subtotal,
            percent: Math.round((subtotal / threshold) * 100)
        };
    }

    getCartTotals() {
        const subtotal = this.getCartSubtotal();
        const discount = this.getDiscountValue();
        const shipping = subtotal > this.config.freeShippingThreshold || subtotal === 0 ? 0 : 150; // free shipping above threshold
        // Inclusive 18% GST (GST is contained inside the premium price, rather than added on top as a hidden surcharge!)
        const taxableAmount = subtotal - discount;
        const tax = Math.round((taxableAmount * 0.18) / 1.18);
        const total = taxableAmount + shipping;

        return {
            subtotal,
            discount,
            shipping,
            tax,
            total,
            couponCode: this.coupon ? this.coupon.code : null
        };
    }

    // Simulated Order Logic
    createOrder(shippingDetails, customOrderId = null) {
        const totals = this.getCartTotals();
        const orderNumber = customOrderId || ("NF-" + Date.now().toString().slice(-8) + "-" + Math.floor(1000 + Math.random() * 9000));
        
        const newOrder = {
            orderNumber,
            date: new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
            shippingDetails,
            items: [...this.cart],
            totals,
            status: "Placed"
        };

        this.orders.push(newOrder);
        this.saveToStorage("nafume_orders", this.orders);
        this.clearCart();
        return orderNumber;
    }

    getOrders() {
        return this.orders;
    }

    getOrder(orderNumber) {
        return this.orders.find(o => o.orderNumber === orderNumber) || null;
    }
}

// Global Export
window.stateManager = new NafumeStateManager();
