# Solenne Editorial — Shopify theme

A complete Online Store 2.0 theme for a contemporary women's fashion brand.
Editorial layouts, scroll storytelling, shop-the-look, a drifting community
gallery, a focus carousel, a slide-out bag with free-shipping progress, a
browser wishlist and instant predictive search — all as native Shopify
sections editable in **Online Store → Customize**.

The brand name, palette, fonts and copy are temporary placeholders. Everything
is a theme setting or a section setting; nothing brand-specific is hardcoded.

## Install

### Shopify CLI (recommended)

```bash
npm i -g @shopify/cli
cd theme
shopify theme push --unpublished --store your-store.myshopify.com
```

Then open **Online Store → Themes → Solenne Editorial → Customize**, upload
images, pick collections and publish when ready.

### Manual

Zip the `theme/` folder (the zip must contain `layout/`, `sections/`, etc. at
its root) and upload it in **Online Store → Themes → Add theme → Upload zip**.

## After installing

| Step | Where |
|------|-------|
| Create the main menu with a **Shop** item that has nested links (they become the mega menu). | Navigation |
| Enable filters (Size, Colour, Price, Availability). | Apps → Search & Discovery → Filters |
| Set complementary products for "Complete the look" (optional, falls back to related). | Apps → Search & Discovery → Recommendations |
| Upload the campaign hero image / video and homepage imagery. | Customize → Home page |
| Position shop-the-look hotspots with the X / Y sliders. | Customize → Shop the look |
| Pick collections for the category panels and bestsellers. | Customize → Home page |
| Choose a size-guide page. | Customize → Product page |
| Add the `custom.fabric_care` and `custom.short_description` product metafields (optional). | Settings → Custom data → Products |
| Set the free-shipping threshold, accent colour, fonts, logo. | Customize → Theme settings |

## Structure

```
theme/
├── layout/            theme.liquid, password.liquid
├── templates/         JSON templates (index, collection, product, cart, search, page, blog, article, 404, list-collections, password, customers/*), gift_card.liquid
├── sections/          homepage sections, header/footer groups, main-* sections, cart drawer, predictive search
├── snippets/          product-card, price, swatch, image, placeholder, facets, icon, wishlist-drawer, css-variables, meta-tags, address-fields
├── assets/            base.css, home.css, collection.css, product.css, theme.js, home.js, collection.js, product.js
├── config/            settings_schema.json, settings_data.json
└── locales/           en.default.json, es.json
```

## Homepage sections

`campaign-hero`, `editorial-drop`, `shop-the-look`, `collection-story`,
`category-panels`, `horizontal-gallery`, `bestsellers-carousel`,
`product-reveal`, `worn-your-way`, `community-gallery`, `private-access`,
`editorial-statement`. All can be added, reordered and hidden on any page.

## Notes

* Placeholder imagery is generated as warm-neutral SVG frames wherever an
  image hasn't been uploaded, so layouts stay composed during setup.
* Wishlist and recently-viewed live in the visitor's browser (localStorage);
  no app required.
* Free-shipping progress compares against the store's main currency.
* All motion respects `prefers-reduced-motion`. Custom cursor, parallax,
  reveals and page transitions can be switched off in Theme settings → Motion.
