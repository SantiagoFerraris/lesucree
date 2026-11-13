# Tooling scope

- [x] Explicitly preserve the product-row type through sorting in AdminProductos; preview build is clean.
- [x] Remove unused Drizzle/Postgres tooling and stale dependency entries; @types/dompurify was already absent.
- [x] Verify maintained SheetJS 0.20.3 through XLSX/XLS/CSV import tests without changing the modal.
- [x] Complete and run customer grouping, promotion and product-status tests; all 33 tests pass.
- [x] Configure locked CI installation, TypeScript checks and tests before build; document setup, environment and all Edge Functions.

# Product detail URLs

- [x] Add one migration for collision-free, name-derived slugs that remain stable after creation; 109 products backfilled uniquely.
- [x] Add the public product route and page with variant/quantity/cart parity, SEOHead, Product JSON-LD and copy-link action.
- [x] Update only catalog opening handlers; preserve the original modal as fallback and quick view.
- [x] Verify a real product link, copy, reload, modal, cart quantity, mobile fit and missing-product 404; existing 33 tests pass.

# Dynamic sitemap

- [x] Add and verify a public read-only sitemap function with visible product URLs and authoritative lastmod values; live GET returns 7 static pages and 63 products.
- [x] Add the sitemap rewrite without changing existing headers; robots and fallback references are correct. The domain currently serves the 7-page fallback until this rewrite is published.