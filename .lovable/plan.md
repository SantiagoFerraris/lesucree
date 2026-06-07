## Goal
Replace the static product grid in the FeaturedSection with a `ProductCarousel` while preserving the loading skeletons.

## Changes

### File: `src/pages/Index.tsx`

1. **Add import** (after existing imports, around line 18):
   ```tsx
   import ProductCarousel from "@/components/ProductCarousel"
   ```

2. **Replace the product grid** (lines 180-197) inside `FeaturedSection`:
   - **When `isLoading`** — render the same 3 skeleton cards, wrapped in the original grid container (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-12`).
   - **When not `isLoading`** — render `<ProductCarousel>` with these props:
     - `products={products || []}`
     - `variants={allVariants}`
     - `categories={categories}`
     - `activePromotions={promosMap}`
     - `onProductClick={setSelectedProduct}`

No other component, section, or file will be touched.