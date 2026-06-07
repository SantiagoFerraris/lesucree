import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import ProductCard from "@/components/ProductCard";
import type { Tables } from "@/integrations/supabase/types";
import type { Category } from "@/hooks/useCategories";
import type { ActivePromotion } from "@/hooks/useActivePromotions";

interface Variant {
  id: string;
  label: string;
  price: number;
  sort_order: number;
  product_id: string;
}

interface ProductCarouselProps {
  products: Tables<"products">[];
  variants?: Variant[];
  categories?: Category[];
  activePromotions?: Map<string, ActivePromotion[]>;
  onProductClick?: (product: Tables<"products">) => void;
}

export default function ProductCarousel({
  products,
  variants = [],
  categories,
  activePromotions,
  onProductClick,
}: ProductCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: true,
    dragFree: false,
  });

  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = React.useRef(false);

  const getVariants = (productId: string) =>
    variants
      .filter((v) => v.product_id === productId)
      .map(({ id, label, price }) => ({ id, label, price }));

  const startAutoplay = React.useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!pausedRef.current) emblaApi?.scrollNext();
    }, 3500);
  }, [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;
    startAutoplay();
    const onPointerDown = () => {
      pausedRef.current = true;
    };
    const onSettle = () => {
      pausedRef.current = false;
    };
    emblaApi.on("pointerDown", onPointerDown);
    emblaApi.on("settle", onSettle);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      emblaApi.off("pointerDown", onPointerDown);
      emblaApi.off("settle", onSettle);
    };
  }, [emblaApi, startAutoplay]);

  return (
    <div
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex-[0_0_80%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] xl:flex-[0_0_25%] min-w-0 cursor-pointer"
              onClick={() => onProductClick?.(p)}
            >
              <ProductCard
                product={p}
                variants={getVariants(p.id)}
                categories={categories}
                activePromotions={activePromotions}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
