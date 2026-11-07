# Tooling conventions

- Keep database runtime and schema deployment in Lovable Cloud with SQL migrations and Deno Edge Functions, not a local ORM; this avoids unused duplicate tooling.
- Keep Excel compatibility tests beside the importer and generate workbook fixtures in memory with mocked writes; this verifies real parsing without touching customer orders.