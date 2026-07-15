import { cn } from "@/lib/utils";

// dub-style background primitives: a fine SVG grid and dot pattern used as
// section accents. Both take an explicit `id` so they can render on the server
// (no useId hook) while keeping pattern ids unique across instances.

export function Grid({
  id,
  cellSize = 44,
  strokeWidth = 1,
  patternOffset = [0, 0],
  className,
}: {
  id: string;
  cellSize?: number;
  strokeWidth?: number;
  patternOffset?: [number, number];
  className?: string;
}) {
  return (
    <svg
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        className,
      )}
      aria-hidden
    >
      <defs>
        <pattern
          id={`grid-${id}`}
          x={patternOffset[0] - 1}
          y={patternOffset[1] - 1}
          width={cellSize}
          height={cellSize}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${cellSize} 0 L 0 0 0 ${cellSize}`}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
          />
        </pattern>
      </defs>
      <rect fill={`url(#grid-${id})`} width="100%" height="100%" />
    </svg>
  );
}

export function DotsPattern({
  id,
  dotSize = 1.5,
  gapSize = 16,
  patternOffset = [0, 0],
  className,
}: {
  id: string;
  dotSize?: number;
  gapSize?: number;
  patternOffset?: [number, number];
  className?: string;
}) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full text-neutral-950/[0.08] ${className ?? ""}`}
      aria-hidden
    >
      <defs>
        <pattern
          id={`dots-${id}`}
          x={patternOffset[0] - 1}
          y={patternOffset[1] - 1}
          width={dotSize + gapSize}
          height={dotSize + gapSize}
          patternUnits="userSpaceOnUse"
        >
          <rect x={1} y={1} width={dotSize} height={dotSize} fill="currentColor" />
        </pattern>
      </defs>
      <rect fill={`url(#dots-${id})`} width="100%" height="100%" />
    </svg>
  );
}

// The signature dub "aurora": layered colorful radial gradients, heavily
// blurred and dropped to a low opacity so they read as a soft glow.
export function Aurora({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute ${className ?? ""}`}
      style={{
        backgroundImage: `radial-gradient(at 27% 37%, hsla(215, 98%, 61%, 1) 0px, transparent 50%),
          radial-gradient(at 97% 21%, hsla(160, 90%, 55%, 1) 0px, transparent 50%),
          radial-gradient(at 52% 99%, hsla(190, 95%, 55%, 1) 0px, transparent 50%),
          radial-gradient(at 10% 29%, hsla(256, 96%, 67%, 1) 0px, transparent 50%),
          radial-gradient(at 97% 96%, hsla(38, 60%, 74%, 1) 0px, transparent 50%),
          radial-gradient(at 33% 50%, hsla(222, 67%, 73%, 1) 0px, transparent 50%),
          radial-gradient(at 79% 53%, hsla(174, 68%, 55%, 1) 0px, transparent 50%)`,
        filter: "blur(100px) saturate(150%)",
        opacity: 0.18,
      }}
    />
  );
}
