# Tooling conventions

- Keep database runtime and schema deployment in Lovable Cloud with SQL migrations and Deno Edge Functions, not a local ORM; this avoids unused duplicate tooling.
- Keep Excel compatibility tests beside the importer and generate workbook fixtures in memory with mocked writes; this verifies real parsing without touching customer orders.
- Assign immutable product slugs in a database trigger with a name-derived prefix and UUID suffix; this keeps public links stable and collision-free without modifying admin forms.
- Keep route product details in the dedicated page while retaining the original modal for quick view; this respects the limited editing scope and preserves existing callers.
- Generate the dynamic sitemap in a public read-only Edge Function and mirror the static fallback entries; this keeps product visibility server-filtered without changing storefront rendering.