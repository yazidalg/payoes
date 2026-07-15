"use client";

// Minimum height of the product screenshot area. Swap the placeholder below with
// next/image when the asset is ready:
//   <Image src="/marketing/product-screenshot.png" alt="Payoes dashboard" fill className="object-cover object-top" priority />
const SCREENSHOT_MIN_HEIGHT = 560;

export function HeroShowcase() {
  return (
    <div className="relative mt-16 w-full sm:mt-28">
      {/* Full-bleed neutral surface with a straight top edge. The shelf's top is
          flush with this edge and the whole shelf hangs downward into the
          surface, so the concave fillets flare with nothing above them. */}
      <div className="relative left-1/2 w-screen -translate-x-1/2 bg-neutral-100 [mask-image:linear-gradient(black_92%,transparent)]">
        <div className="mx-auto max-w-5xl px-4 pt-16 sm:px-6 sm:pt-24">
          <div className="overflow-hidden rounded-[1.75rem] border border-neutral-200/80 bg-white shadow-[0_24px_48px_-16px_rgba(0,0,0,0.10)]">
            <div
              className="relative w-full"
              style={{ minHeight: SCREENSHOT_MIN_HEIGHT }}
            >
              <div className="flex min-h-[inherit] w-full items-center justify-center bg-neutral-50">
                <p className="text-sm font-medium text-neutral-400">
                  Product screenshot
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Curved shelf hanging downward into the surface: its top is flush with the
          surface edge, its bottom is rounded, and concave fillets at the top
          corners sweep the surface down into the shelf's vertical sides. */}
      <div className="absolute left-1/2 top-0 z-20 min-h-12 w-[min(48rem,calc(100vw-3rem))] -translate-x-1/2 rounded-b-[1.75rem] bg-white">
        {/* Concave fillets at the surface top edge (flush with the shelf top),
            sweeping the gray surface down into the shelf's vertical sides. */}
        <span
          aria-hidden
          className="absolute left-0 top-0 h-10 w-10 -translate-x-full"
          style={{
            background: `radial-gradient(circle at bottom left, transparent 40px, #ffffff 40px)`,
          }}
        />
        <span
          aria-hidden
          className="absolute right-0 top-0 h-10 w-10 translate-x-full"
          style={{
            background: `radial-gradient(circle at bottom right, transparent 40px, #ffffff 40px)`,
          }}
        />
      </div>
    </div>
  );
}
