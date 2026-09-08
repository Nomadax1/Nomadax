# Theme preview (offline)

Renders `../theme` locally with mock products, a mock cart, predictive
search, filters and recommendations — useful for design review without a
Shopify store. Not part of the theme and not needed for deployment.

```bash
cd theme-preview
npm install
npm start          # http://localhost:4321
```

Shopify-specific filters and tags are stubbed, so anything that depends on
real store data (Markets, customer accounts, metafields) is approximated.
Verify final behaviour on a Shopify preview theme.
