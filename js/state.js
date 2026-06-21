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

const NAFUME_PRODUCTS = [
    {
        id: "italian-bloom",
        newLaunch: true,
        name: "Italian Bloom",
        tagline: "Floral & Sun-Drenched",
        description: "A sun-drenched terrace in Amalfi. Italian Bloom captures the romance of fresh-cut Bulgarian Rose and Citrus orchards, balanced by light Musk. A bright, elegant, and romantic scent.",
        family: "Floral",
        intensity: 3,
        longevity: "Moderate (8h+)",
        sillage: "Intimate Trail",
        topNotes: "Bergamot, Lemon, Green Apple",
        heartNotes: "Bulgarian Rose, Jasmine, Peony",
        baseNotes: "White Musk, Amber, Cedarwood",
        price50ml: 1499,
        mrp50ml: 1999,
        price100ml: 2499,
        mrp100ml: 3299,
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDXUBLaE4gr4Hpy2J8VID9j61aSr2wlVGmhhJS6ZsDeEwEgUPdoHy1HAn35qETLfE2hyy7GP1rO5KxqqIZ-_Ylm8B6lmUlhPyQ29xCzvevHVQhYhGuTFD9MN0stLdrlNXDtvSDkahU_wBOT3O3pisZYlt4ztifHRsejj2Q-FVt63oxUSQz5Vz04yprkMRHl3ZY-Xq2f-ZbnqisBW8G9fB4uEk8_kQ2wq3IESlaBwf2_F5Jv8UmdtGqWpl_ueGTmhLXSpDAzeYkbdc0F",
        howToUse: "Apply onto pulse points—wrists, neck, and behind ears. Avoid rubbing wrists together, as this breaks down the delicate top notes of citrus and rose.",
        ingredients: "Alcohol Denat., Fragrance (Parfum), Water (Aqua), Limonene, Linalool, Citronellol, Geraniol, Citral, Benzyl Alcohol, Farnesol."
    },
    {
        id: "mystical-oud",
        newLaunch: true,
        name: "Mystical Oud",
        tagline: "Smoky & Majestic",
        description: "A deep, warm fragrance featuring royal aged Oud wrapped in luxurious leather, Frankincense, and sweet Amber. Made for special evenings, commanding attention with rich elegance.",
        family: "Oud",
        intensity: 5,
        longevity: "Eternal (14h+)",
        sillage: "Strong Presence",
        topNotes: "Cardamom, Saffron, Nutmeg",
        heartNotes: "Aged Oud, Leather, Rose",
        baseNotes: "Amber, Sandalwood, Frankincense, Patchouli",
        price50ml: 1999,
        mrp50ml: 2699,
        price100ml: 3199,
        mrp100ml: 4299,
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCVUZ2qntPFWE0RxPMYK9eOMrs6S14SWcgMK3ySjui60LZx_ByZ5ZYyzh7z3177R29rQQqLZwS3linS8ayoJT1K2vOj5yh-Y3uB70PztW_gBOHH-EuaSx6Qk5QQASsFCBdnT7gmhAxrDYMevY6-ogjv5xUO_IuEPUTM4EzfNni-5-i89h69-S8gaR16Cbldsqn_HoNl9jj4jbv3PbI2kbJaT7rCx1R47-End_TChVI2ji7Jv7xAlXZ9lxPwARhTdff0zXVeBcpTr8D3",
        howToUse: "Apply 2-3 sprays on warm chest and pulse points. The extreme concentration of our Extrait de Parfum means a little goes a very long way.",
        ingredients: "Alcohol Denat., Fragrance (Parfum), Aqua (Water), Alpha-Isomethyl Ionone, Coumarin, Eugenol, Linalool, Benzyl Benzoate, Cinnamal."
    },
    {
        id: "vanilla-smoke",
        newLaunch: true,
        name: "Vanilla Smoke",
        tagline: "Gourmand & Mysterious",
        description: "An intoxicating blend of rich Madagascan Vanilla and dark tobacco leaves, rounded by charred Birch Wood and Amber. A sweet yet dark, comforting, and deeply mysterious scent.",
        family: "Gourmand",
        intensity: 4,
        longevity: "Long Lasting (10h+)",
        sillage: "Enveloping Warmth",
        topNotes: "Tobacco Leaf, Spicy Notes, Bergamot",
        heartNotes: "Madagascan Vanilla, Cacao, Tonka Bean",
        baseNotes: "Birch Wood, Dried Fruits, Benzoin",
        price50ml: 1699,
        mrp50ml: 2299,
        price100ml: 2799,
        mrp100ml: 3699,
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDEodOsItWYqQZbxIAZYjLEgWC7RCYEkMQp-beWTFnXha8tRyJp2MLkHFYFvhACsRFE9z3TnWzbg3rka-zFxL3wbvV0_IBZ8Z6DTdJopHr6erhjPn7vKqQrLC2X25Nxzg_mtzFdzNLVnSXyPQHjjcDjfyOxnDIE0hPi9BYoo9tvm-h6wXEzr_yEyaqRvksyPDC2YVqEvRPLkx-6OdUoqbOHoLro-3RrBOQP6GO3SG6ATn84Gzuypj-FfW4LedcKIgg6tqRJgO_Rj08y",
        howToUse: "Spray on pulse points. For an extra subtle, long-lasting trail, mist your hairbrush and run it lightly through dry hair.",
        ingredients: "Alcohol Denat., Fragrance (Parfum), Water (Aqua), Vanillin, Coumarin, Anise Alcohol, Benzyl Alcohol, Cinnamyl Alcohol."
    },
    {
        id: "aqua-noir",
        newLaunch: true,
        name: "Aqua Noir",
        tagline: "Fresh & Oceanic",
        description: "A dark ocean at midnight. Crisp sea salts and zesty Grapefruit combined with mineral notes of Oakmoss, Vetiver, and Ambergris. Dynamic, refreshing, and sophisticated.",
        family: "Fresh",
        intensity: 3,
        longevity: "Long Lasting (9h+)",
        sillage: "Radiant Sillage",
        topNotes: "Grapefruit, Sea Salt, Mandarin Orange",
        heartNotes: "Bay Leaf, Jasmine, Mineral Seaweed Accord",
        baseNotes: "Ambergris, Oakmoss, Vetiver, Guaiac Wood",
        price50ml: 1499,
        mrp50ml: 1999,
        price100ml: 2499,
        mrp100ml: 3299,
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBLqNL1l5T1By8qyT--PW4DU6h-QhguYYJEYekD5dGVLnwFQisiTC61DZZI30UWTmfLpYkXDUH5GT0XjTvHy3SEUnb-ZUvmZ9PWewZWqYvEXU1rclezwdAle7VVGiz4rKDnAt6oOht4GlB3EqTu9cIOklmW-A7CyuUZIyqxi8wZwSGv2rGQDjQE_ezyXK6mn3yq8pBL2JuZ_Upx9LgZa04TLUeOuF3-2I5kiyLfSABT6foA22bhUnqr36R9lPL0sEJzv7FgxiCxDq3l",
        howToUse: "Perfect for active daytime wear. Generously apply to clean skin after a warm shower to maximize the fresh, marine molecules.",
        ingredients: "Alcohol Denat., Fragrance (Parfum), Water (Aqua), Benzyl Salicylate, Linalool, Citronellol, Limonene, Geraniol, Citral."
    },
    {
        id: "sacred-ash",
        newLaunch: true,
        name: "Sacred Ash",
        tagline: "Woody & Ceremonial",
        description: "A ceremonial journey through smoke and absolute stillness. Sacred Ash captures the quiet moment when burning Oud meets creamy Mysore Sandalwood, grounded by Saffron.",
        family: "Woody",
        intensity: 5,
        longevity: "Eternal (12h+)",
        sillage: "Enveloping Trail",
        topNotes: "Saffron, Bergamot, Pink Pepper",
        heartNotes: "Aged Oud, Bulgarian Rose, Incense Accord",
        baseNotes: "Sandalwood, Amber, Sacred Ash Accord, Cedarwood",
        price50ml: 2299,
        mrp50ml: 2999,
        price100ml: 3799,
        mrp100ml: 4999,
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC0TB_tSgRYL3Pueh0h-46fevQx2x_RPj-sNjCoISaAfTwZBsK2f_FXev19ObHVLSJuUqNPDabk2yt3o_teMJX8Lmgg3dugF5MAbm_hl89Kkh9Zn006B1UIrNusuCgKx3D1BUmLU1Tv--3Knvqfgouyv_0oPKlLMlMfww5s6Ml-ovJlJocvGAt2WlB1NTK2X0tPmquLDnZf2b8qk_4s2CWqXOUqkYFxxJoH1Nan5kMDIGLWAcoV-c9O64JCAJTxc0N99GSEWf0xzvT6",
        howToUse: "Apply to pulse points and the inner lining of your coat. Ideal for special evening wear, rituals, or moments of quiet introspection.",
        ingredients: "Alcohol Denat., Fragrance (Parfum), Water (Aqua), Santalol, Eugenol, Saffron extract, Benzyl Benzoate, Cinnamal, Isoeugenol."
    },
    {
        id: "velvet-moss",
        name: "Velvet Moss",
        tagline: "Earthy & Verdant",
        description: "Dappled sunlight filtering through ancient forest canopies. Velvet Moss is a crisp, damp earthy scent highlighting Oakmoss, green Galbanum, earthy Patchouli, and clean Vetiver.",
        family: "Fresh",
        intensity: 3,
        longevity: "Moderate (8h+)",
        sillage: "Intimate Whisper",
        topNotes: "Green Ivy, Galbanum, Bergamot",
        heartNotes: "Velvet Moss Accord, Violet Leaves, Geranium",
        baseNotes: "Patchouli, Vetiver, Ambergris, Oakmoss",
        price50ml: 1799,
        price100ml: 2999,
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBF3bzcMdgikBK0k5yOmx7gsqk9TeNngufB6r_I6Fi55tyvaI9Xj3BdmMUsgjHb7nistS4v29vzzQodnThgwQKqnXp-RFmd28TutUYcKzA2fZ7oUbODePEig_qzraGUYKJB0hPNvkWylVjIAz1l5o0lsFeAJJXbizfjp_KCpjmSrxyKKPOxZLwVRk-THjGk0qtmR7ZreUMnYhjxeTDXkZLSQBIvgRcMxFTrTdI9IrEhuU04kZ0_A649magPYom_THu0lb1f7gOFZ0Hd",
        howToUse: "Mist directly onto bare skin on pulse points. Excellent for outdoor gatherings, workdays, or whenever you want to evoke nature's calm.",
        ingredients: "Alcohol Denat., Fragrance (Parfum), Water (Aqua), Citronellol, Linalool, Evernia Prunastri (Oakmoss) Extract, Oakmoss absolute."
    },
    {
        id: "noir-fig",
        name: "Noir Fig",
        tagline: "Floral & Sensual",
        description: "A dark, sensual fusion of fresh, juicy black fig and sweet Bulgarian Rose, resting on a base of creamy Cedarwood and rich leather. Exotic, floral, and deeply addictive.",
        family: "Floral",
        intensity: 4,
        longevity: "Long Lasting (10h+)",
        sillage: "Enveloping Trail",
        topNotes: "Black Fig, Fig Leaves, Cardamom",
        heartNotes: "Bulgarian Rose, Orris Root, Jasmine",
        baseNotes: "Cedarwood, Rich Leather, Amber, Musk",
        price50ml: 1899,
        price100ml: 3099,
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDYkSR69plVQah6v9KRi_bexVGlngOME5niCT6mEMki2RhrJP-vNOR9aJ2s8YEPvNxDv2H3mYHo0yoi0mCGM6PCGtRJc-5vV-tCgpZNdqvHTRau5Colv6kcJLSQAcrTlRixAbjk4oXHyzGmM0MCES9iz7RDEa2nrLCuKb2QL4J9v3AxUxfu_qE9vaVREf4ucyyTY48Nhhu0KT8y4_g1Qtt7ltwxvdEYP4pJ5zHwqvkZOuZEWujepfctv00nEhRjJYIX_NYi0FjNLCEA",
        howToUse: "Apply behind ears and at the collarbones. Let the heat of your pulse points bloom the sensual transition from sweet fig to deep rose.",
        ingredients: "Alcohol Denat., Fragrance (Parfum), Water (Aqua), Citral, Linalool, Alpha-Isomethyl Ionone, Geraniol, Eugenol, Benzyl Salicylate."
    },
    {
        id: "solar-neroli",
        name: "Solar Neroli",
        tagline: "Citrus & Radiant",
        description: "Crisp white linen in absolute summer sunshine. Solar Neroli opens with bright Neroli and Orange Blossom, grounded by clean White Musk and radiant Amber notes.",
        family: "Citrus",
        intensity: 3,
        longevity: "Moderate (8h+)",
        sillage: "Radiant Breeze",
        topNotes: "Neroli, Petitgrain, Bergamot",
        heartNotes: "Orange Blossom, Jasmine, Rosemary",
        baseNotes: "White Musk, Ambergris, Ambrette Seed",
        price50ml: 1599,
        price100ml: 2699,
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDYq0kbmHW8V-Hr3td5FHtZIPZW-iGfvEF9JYD5AJ7nlKuoHhfEUpLUiKMopYFLbZTCy0FZCAwLcfkCfIHuelXuA8FFzyHzJiLwAtgNqlf8oKx1X8zXkg5Rgk4TJGlag_qVewvlIx7iA976sAQKqG2zYODfs39NoFwBTwjkaZxpSoY6YxH3FGA1VGYBLNFvNJ5m9Dfw5uIpL21Az9JQ5LrtLFuo-lz64FKATV6QU5eBHKqQDco2Pw7Ag-jjrpIQdlRLKGUlz_KMJDej",
        howToUse: "Spray liberally over body and pulse points. The perfect uplifting, crisp fragrance to wear during hot summer afternoons.",
        ingredients: "Alcohol Denat., Fragrance (Parfum), Water (Aqua), Limonene, Nerol, Linalool, Citral, Geraniol, Farnesol, Hydroxycitronellal."
    },
    {
        id: "discovery-set",
        name: "The Discovery Set",
        tagline: "Explore Our Artistry",
        description: "Begin your olfactory journey with five of our signature creations in 2ml sample vials. Includes Italian Bloom, Mystical Oud, Vanilla Smoke, Aqua Noir, and Sacred Ash.",
        family: "Unisex",
        intensity: 4,
        longevity: "Various Profiles",
        sillage: "Various Trails",
        topNotes: "Various (5 x 2ml vials)",
        heartNotes: "Various (5 x 2ml vials)",
        baseNotes: "Various (5 x 2ml vials)",
        price50ml: 999, // default price for discovery set in database
        price100ml: null,
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAtpM0w5Et7u1hLnvFXKdOh0p45AhLtWaCmCfU3mn5NpnujYQ9fScx5Ks9LONY653G_xduZf6JtTsSYulBSpTFWL3jvArFW-rj3lurA-gyjakJtPPA36y7llTfFwjiSX7WRvJz_PSD-WeOoBrztbJmfu1DjN4rGwupnmlIRGWGx_6JDf7AKcajOBYQL79tA5FLxemLpz8kqVYt3EJYmv0b9R60frgaTihcmkL7pqKwWIsyfrjEysE6VmXe-RcH3I6r5WARSJMfdUqDm",
        howToUse: "Explore each vial over separate days. Apply on skin to observe how the dry-down interacts with your individual body chemistry over 8-12 hours.",
        ingredients: "Includes five distinct formulas. Please check the individual labels included inside the luxurious collection box."
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
