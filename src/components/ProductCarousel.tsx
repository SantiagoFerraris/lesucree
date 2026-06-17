import { memo } from "react"
import * as React from "react"
import useEmblaCarousel from "embla-carousel-react"
import type { Tables } from "@/integrations/supabase/types"
import type { Category } from "@/hooks/useCategories"
import type { ActivePromotion } from "@/hooks/useActivePromotions"
import ProductImage from "@/components/ProductImage"

interface ProductCarouselProps {
  products: Tables<"products">[]
  variants?: { id: string; label: string; price: number; sort_order: number; product_id: string }[]
  categories?: Category[]
  activePromotions?: Map<string, ActivePromotion[]>
  onProductClick?: (product: Tables<"products">) => void
}

function ProductCarousel({
  products,
  onProductClick,
}: ProductCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: true,
    dragFree: false,
    containScroll: "trimSnaps",
  })

  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const pausedRef = React.useRef(false)

  const startAutoplay = React.useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      if (!pausedRef.current) emblaApi?.scrollNext()
    }, 3500)
  }, [emblaApi])

  React.useEffect(() => {
    if (!emblaApi) return
    startAutoplay()
    const onPointerDown = () => { pausedRef.current = true }
    const onSettle = () => { pausedRef.current = false }
    emblaApi.on("pointerDown", onPointerDown)
    emblaApi.on("settle", onSettle)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      emblaApi.off("pointerDown", onPointerDown)
      emblaApi.off("settle", onSettle)
    }
  }, [emblaApi, startAutoplay])

  return (
    <div
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex" style={{ marginLeft: "-16px" }}>
          {products.map((p) => (
            <div
              key={p.id}
              className="flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 cursor-pointer" style={{ paddingLeft: "16px" }}
              onClick={() => onProductClick?.(p)}
            >
              <div className="group">
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-cream">
                  <ProductImage src={p.image_url} alt={p.name} />
                </div>
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-espresso/60">
                    {p.category}
                  </p>
                  <h3 className="font-serif text-lg text-espresso group-hover:text-gold transition-colors duration-300">
                    {p.name}
                  </h3>
                  <p className="text-sm text-espresso/70 line-clamp-2">
                    {p.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default memo(ProductCarousel)
