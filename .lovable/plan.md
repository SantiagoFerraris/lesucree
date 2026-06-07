# Plan: Create `src/components/ProductCarousel.tsx`

New file only — no other file is touched. The pasted snippet lost its TypeScript generics in transit (e.g. `Map`, `useRef | null>`, empty JSX), so I'll reconstruct it faithfully with proper types matching the existing `ProductCard` API.

## File: `src/components/ProductCarousel.tsx`

- Client component using `embla-carousel-react` (already installed).
- Props:
  - `products: Tables<'products'>[]`
  - `variants?: { id; label; price; sort_order; product_id }[]`
  - `categories?: Category[]`
  - `activePromotions?: Map<string, ActivePromotion[]>`
  - `onProductClick?: (product) => void`
- Embla options: `align: "start"`, `loop: true`, `dragFree: false`.
- Autoplay: `setInterval` every 3500ms calling `emblaApi.scrollNext()`, paused while `pausedRef.current` is true.
- Pause triggers: Embla `pointerDown` and container `onMouseEnter`; resume on `settle` and `onMouseLeave`. Interval cleared on unmount.
- Layout: outer `div` with `overflow-hidden` ref'd by `emblaRef`, inner flex track, each slide a `flex-[0_0_auto]` clickable wrapper (basis ~ responsive: `basis-[80%] sm:basis-1/2 lg:basis-1/3 xl:basis-1/4`) calling `onProductClick?.(p)` and rendering `<ProductCard product={p} variants={getVariants(p.id)} categories={categories} activePromotions={activePromotions} />`.
- `getVariants(productId)` filters the variants array by `product_id` and passes only `{id,label,price}` (shape `ProductCard` expects).

## Technical notes

- Type the interval ref as `React.MutableRefObject<ReturnType<typeof setInterval> | null>`.
- Import `type { Tables } from "@/integrations/supabase/types"`, `type { Category } from "@/hooks/useCategories"`, `type { ActivePromotion } from "@/hooks/useActivePromotions"`.
- No changes to `ProductCard`, hooks, pages, or styles.

Confirm and I'll create the file.
