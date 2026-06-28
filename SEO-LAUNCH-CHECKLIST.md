# NAFUME — Google Search Console Launch Checklist

Last updated: 2026-06-28

---

## 1. Domain & Verification

- [ ] Add property `https://www.nafume.com/` in Google Search Console (URL-prefix method)
- [ ] Verify via DNS TXT record (preferred) or HTML file upload
- [ ] Confirm `www` redirects to `https://www` (Vercel handles this)
- [ ] Submit sitemap: `https://www.nafume.com/sitemap.xml`

---

## 2. Sitemap ✅ Done

- [x] `sitemap.xml` at root — valid XML, submitted to GSC
- [x] All canonical product, collection, guide, legal, brand, support pages included
- [x] Image sitemap entries added for homepage + all 5 product pages
- [x] Transactional pages (`/pages/order/*`), account, admin, dynamic template excluded
- [x] `xmlns:image` namespace present for image sitemap
- [x] All URLs use `https://www.nafume.com/` (no trailing `.html`)

---

## 3. Robots.txt ✅ Done

- [x] `robots.txt` at root, accessible at `https://www.nafume.com/robots.txt`
- [x] Sitemap line present
- [x] Blocked: `/pages/account/`, `/pages/order/*`, `/admin/`, `/pages/collections/collection`, `/checkout`, `/fragrance-finder`, `/cart`

---

## 4. Canonical Tags ✅ Done

All indexable pages have:
- [x] Self-referencing `<link rel="canonical" href="https://www.nafume.com/..."/>` (no `.html`, no trailing slash except homepage)
- [x] Consistent `https://www.` format throughout

---

## 5. Meta Titles & Descriptions ✅ Done

- [x] All titles unique, 50–65 characters
- [x] All descriptions unique, 140–160 characters
- [x] No "Eau De Parfum" / "EDP" in any title or description
- [x] No keyword stuffing
- [x] Product pages: `[Product] 50ML | [Keyword] Perfume by NAFUME`
- [x] Collection pages: keyword-first titles

---

## 6. Indexability ✅ Done

| URL | Indexable | noindex | In Sitemap |
|-----|-----------|---------|------------|
| `/` (homepage) | ✅ | — | ✅ |
| `/pages/products/seduction` | ✅ | — | ✅ |
| `/pages/products/dark-oud` | ✅ | — | ✅ |
| `/pages/products/red-spirit` | ✅ | — | ✅ |
| `/pages/products/aqua-manthan` | ✅ | — | ✅ |
| `/pages/products/all-day-misfit` | ✅ | — | ✅ |
| `/pages/collections/shop` | ✅ | — | ✅ |
| `/pages/collections/collections` | ✅ | — | ✅ |
| `/pages/collections/gifting` | ✅ | — | ✅ |
| `/pages/collections/build-your-own-box` | ✅ | — | ✅ |
| `/pages/collections/perfumes-for-men` | ✅ | — | ✅ |
| `/pages/collections/perfumes-for-women` | ✅ | — | ✅ |
| `/pages/collections/unisex-perfumes` | ✅ | — | ✅ |
| `/pages/collections/office-everyday-perfumes` | ✅ | — | ✅ |
| `/pages/collections/date-night-perfumes` | ✅ | — | ✅ |
| `/pages/collections/fresh-aquatic-perfumes` | ✅ | — | ✅ |
| `/pages/collections/oud-intense-perfumes` | ✅ | — | ✅ |
| `/pages/guides` | ✅ | — | ✅ |
| `/pages/guides/*` (7 guides) | ✅ | — | ✅ |
| `/pages/support/contact` | ✅ | — | ✅ |
| `/pages/support/faq` | ✅ | — | ✅ |
| `/pages/brand/about` | ✅ | — | ✅ |
| `/pages/legal/privacy-policy` | ✅ | — | ✅ |
| `/pages/legal/shipping-policy` | ✅ | — | ✅ |
| `/pages/legal/return-refund-policy` | ✅ | — | ✅ |
| `/pages/order/confirmation` | ❌ | ✅ noindex,nofollow | ❌ |
| `/pages/order/shipping` | ❌ | ✅ noindex,nofollow | ❌ |
| `/pages/order/track-order` | ❌ | ✅ noindex,follow | ❌ |
| `/pages/brand/consultation` | ❌ | ✅ noindex,nofollow | ❌ |
| `/pages/legal/terms-conditions` | ❌ | ✅ noindex (placeholder data) | ❌ |
| `/pages/legal/grievance-officer` | ❌ | ✅ noindex (placeholder data) | ❌ |
| `/pages/collections/collection?*` | ❌ | ✅ noindex,follow | ❌ |

---

## 7. Structured Data (JSON-LD) ✅ Done

- [x] `Product` schema on all 5 product pages — name, description, image, SKU, brand, offers, URL
- [x] `FAQPage` schema on all 5 product pages
- [x] `BreadcrumbList` schema on product pages
- [x] `Organization` + `WebSite` (with `SearchAction`) schema on homepage
- [x] `Article` schema on all 7 guide pages
- [x] No "Eau De Parfum" in any schema `name` or `description` field

---

## 8. Open Graph & Twitter Cards ✅ Done

- [x] `og:title`, `og:description`, `og:image`, `og:url`, `og:type` on all pages
- [x] `twitter:card` on all pages
- [x] OG images use absolute `https://www.nafume.com/` URLs
- [x] No EDP in OG or Twitter titles

---

## 9. Image SEO ✅ Done

- [x] `alt` text on all `<img>` tags — descriptive, keyword-relevant
- [x] `loading="lazy"` on below-fold images; `loading="eager" fetchpriority="high"` on LCP (banner-1)
- [x] `width` and `height` attributes on all major images (CLS prevention)
- [x] `decoding="async"` on all images
- [x] Hover images changed from `eager` to `lazy`
- [x] Hero banners compressed (quality 81); product gallery 05.jpg files resized 6250→1500px (80% savings)
- [x] Image sitemap entries for homepage and all 5 products

---

## 10. URL Structure ✅ Done

- [x] Clean URLs (no `.html`) — handled by Vercel `cleanUrls: true`
- [x] All internal links use clean URLs
- [x] All canonical tags use clean URLs
- [x] robots.txt uses clean URL paths

---

## 11. Core Web Vitals — Status

- [x] LCP image: `banner-1.jpg` with `fetchpriority="high"` + `loading="eager"` + compressed to ~210KB
- [x] CLS: all images have `width`/`height` attributes
- [ ] **TODO**: Run Lighthouse audit on live domain — target LCP < 2.5s
- [ ] **TODO**: Check INP on product pages with JS-heavy PDP rendering

---

## 12. Priority Indexing Order

Submit URLs in this order after GSC verification:

1. `https://www.nafume.com/` — Homepage (highest priority)
2. `https://www.nafume.com/pages/products/seduction` — Best seller (romantic/women)
3. `https://www.nafume.com/pages/products/aqua-manthan` — Summer/office keyword volume
4. `https://www.nafume.com/pages/products/dark-oud` — Oud keyword volume
5. `https://www.nafume.com/pages/products/all-day-misfit` — Office keyword
6. `https://www.nafume.com/pages/products/red-spirit` — Evening/bold
7. `https://www.nafume.com/pages/collections/shop` — Main shop
8. All collection landing pages
9. All guide pages

---

## 13. Tracking ✅

- No GA4 / GTM connected — using localStorage analytics (`window.OperationsService`)
- [ ] **TODO**: Connect GA4 before launch for organic traffic tracking
- [ ] **TODO**: Link GSC property to GA4 in GSC settings

---

## 14. Pre-launch Remaining Tasks

- [ ] Finalise business details, GSTIN, manufacturer name — then re-enable `terms-conditions` and `grievance-officer` in sitemap + remove noindex
- [ ] Connect GA4 (add gtag.js to all pages)
- [ ] Run GSC URL Inspection on top 5 product pages after first deploy
- [ ] Request indexing on product pages via GSC URL Inspection tool
- [ ] Delete `assets/Screenshots/` and `assets/Shop Top Fragrances Online/` (dev/foreign-brand assets, ~140 unused files) to reduce repo size

---

## 15. Constraints Confirmed (Do Not Violate)

- ❌ No "Eau De Parfum" or "EDP" anywhere in public-facing content
- ❌ No "FDA Approved" or similar unverified health/regulatory claims
- ❌ No fake reviews, ratings, or certifications
- ❌ No keyword stuffing
- ❌ No private API keys, tokens, or customer data in frontend
