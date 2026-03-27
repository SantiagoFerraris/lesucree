

## Plan: Add Pagination to Catálogo + Fix Build Error

### Fix: Build error in sync-prices-from-sheet
The `catch (e)` block uses `e.message` but `e` is typed as `unknown` in TypeScript. Change line 171 to cast: `(e instanceof Error ? e.message : String(e))`.

### Pagination in Catalogo.tsx

**Changes to `src/pages/Catalogo.tsx` only — no other files modified.**

1. **Add state**: `const [page, setPage] = useState(1);` with `ITEMS_PER_PAGE = 9` constant.

2. **Reset page on category change**: Update the category button onClick to also `setPage(1)`.

3. **Paginate products**: Derive `totalPages`, `paginatedProducts` from `products` array using slice.

4. **Render only `paginatedProducts`** in the grid instead of all `products`.

5. **Add pagination controls** below the product grid (after the grid div, before the empty-state check):
   - Previous arrow button (disabled on page 1)
   - Numbered page buttons (1, 2, 3…)
   - Next arrow button (disabled on last page)
   - Styled with the same rounded-full pill buttons matching the category filter style (dusty-pink active, outlined inactive)
   - On click: set page and `window.scrollTo({ top: gridRef position, behavior: 'smooth' })`

6. **Add a ref** to the grid container for smooth scroll targeting.

7. Only show pagination when `totalPages > 1`.

### Technical Details
- Uses `ChevronLeft` and `ChevronRight` from lucide-react (already imported via ProductDetailModal dependencies)
- Active page: `bg-dusty-pink text-white` (matches active category button)
- Inactive page: `border border-dusty-pink text-dusty-pink hover:bg-dusty-pink hover:text-white` (matches inactive category button)
- Arrow buttons use same outlined style, disabled state with `opacity-50 cursor-not-allowed`

