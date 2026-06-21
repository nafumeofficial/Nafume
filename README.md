# NAFUME Artisan Luxe — Static E-Commerce Website

Premium artisan perfume brand website. Pure static HTML/CSS/JS — no build tools, no packages, no backend.

---

## Project Structure

```
/
├── index.html                  ← Home page (entry point)
├── 404.html                    ← Custom 404 page
├── robots.txt
├── sitemap.xml
├── .gitignore
├── .claudeignore
├── README.md
│
├── css/
│   └── launch.css              ← Primary stylesheet (System B)
│   └── style.css               ← Legacy stylesheet (System A — confirmation page)
│
├── js/
│   ├── launch.js               ← Core logic: cart, footer, products, shipping
│   ├── app.js                  ← Legacy JS (System A)
│   └── commerce/
│       ├── config.js           ← Product catalogue & LAUNCH_CONFIG
│       ├── collection-service.js
│       ├── seo-service.js
│       ├── offer-service.js
│       ├── commerce-service.js
│       ├── customer-service.js
│       ├── review-service.js
│       ├── tracking-service.js
│       └── operations-service.js
│
├── assets/
│   ├── images/products/        ← Product images (one folder per product)
│   ├── images/                 ← Brand & UI images
│   └── fonts/                  ← Self-hosted fonts (Acumin Pro Wide, Stevie Sans)
│
├── pages/
│   ├── products/               ← 5 product detail pages
│   │   ├── seduction.html
│   │   ├── dark-oud.html
│   │   ├── red-spirit.html
│   │   ├── aqua-manthan.html
│   │   └── all-day-misfit.html
│   │
│   ├── collections/            ← Shop & collection pages
│   │   ├── collection.html     ← Single collection (uses ?collection=slug)
│   │   ├── collections.html    ← Browse all collections
│   │   ├── shop.html           ← All products / new launches
│   │   ├── gifting.html        ← Gifting page
│   │   └── build-your-own-box.html
│   │
│   ├── order/                  ← Order flow
│   │   ├── shipping.html       ← Shipping form (LIVE checkout → WhatsApp)
│   │   ├── confirmation.html   ← Order confirmation
│   │   └── track-order.html    ← Order tracking
│   │
│   ├── account/
│   │   ├── account.html
│   │   └── register.html       ← Register / create account page
│   │
│   ├── support/
│   │   ├── contact.html
│   │   ├── faq.html
│   │   └── grievance-officer.html
│   │
│   ├── legal/
│   │   ├── privacy-policy.html
│   │   ├── shipping-policy.html
│   │   ├── return-refund-policy.html
│   │   └── terms-conditions.html
│   │
│   └── brand/
│       ├── about.html
│       └── consultation.html
│
├── admin/                      ← Internal admin tools (not indexed)
│   ├── operations-admin.html
│   ├── orders-admin.html
│   └── reviews-admin.html
│
├── _archive/
│   └── deprecated-pages/       ← Old pages (launch, product, wishlist, etc.)
│
└── _backup_before_structure_cleanup/  ← Pre-reorganisation backup
```

---

## Order Flow

```
index.html / pages/products/*.html
  → Add to Cart (cart drawer)
  → pages/order/shipping.html (fill name/address)
  → WhatsApp 918595862227 (order confirmed)
  → pages/order/confirmation.html (summary)
```

Cart state: `nafumeLaunchCart` in localStorage.

---

## Root Redirect Stubs

| File | Redirects to |
|------|-------------|
| `checkout.html` | `/pages/order/shipping.html` |
| `fragrance-finder.html` | `/` (home) |

---

## Deployment

**Upload these folders/files:**

```
index.html
404.html
robots.txt
sitemap.xml
pages/
admin/
assets/
css/
js/
```

**Do NOT upload:**

```
_archive/
_backup*/
docs/
ref/
.claudeignore
```

**Update before launch:**
- Replace `nafume.com` in `sitemap.xml`, `robots.txt`, and SEO meta tags with the final live domain.
- Set `shopifyProductId` / `shopifyVariantId` in `js/commerce/config.js` if connecting Shopify.

---

## Key Technical Notes

- All navigation links use **root-relative paths** (`/pages/products/seduction.html`) — requires a web server (Netlify, Vercel, GitHub Pages). Local `file://` browsing will not resolve root-relative links correctly.
- CSS/JS paths inside `pages/**/*.html` use `../../` relative prefix.
- CSS/JS paths inside `admin/*.html` use `../` relative prefix.
- WhatsApp number: `918595862227` — do not change.
- Pricing: ₹799 sell / ₹1299 MRP — locked in `LAUNCH_CONFIG`.
- Fonts: Acumin Pro Wide Medium & Stevie Sans — self-hosted in `assets/fonts/`.
