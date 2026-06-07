import * as React from "react"

import useEmblaCarousel from "embla-carousel-react"

import { Instagram } from "lucide-react"

interface InstagramPost {
  img: string
  alt: string
  url: string
}

interface InstagramCarouselProps {
  posts: InstagramPost[]
}

export default function InstagramCarousel({ posts }: InstagramCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: true,
    dragFree: false,
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
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex gap-1">
          {posts.map((post, i) => (
            <a
              key={i}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 aspect-square overflow-hidden relative group block flex-shrink-0"
              aria-label={post.alt}
            >
              <img
                src={post.img}
                alt={post.alt}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-espresso/0 group-hover:bg-espresso/40 transition-colors duration-300 flex items-center justify-center">
                <Instagram
                  className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  size={28}
                />
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
