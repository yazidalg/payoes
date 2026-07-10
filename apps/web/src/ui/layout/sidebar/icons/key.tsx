import { SVGProps, useEffect, useRef } from "react";

export function Key({
  "data-hovered": hovered,
  ...rest
}: { "data-hovered"?: boolean } & SVGProps<SVGSVGElement>) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    if (hovered) {
      ref.current.animate(
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(-12deg)" },
          { transform: "rotate(8deg)" },
          { transform: "rotate(0deg)" },
        ],
        {
          duration: 300,
        },
      );
    }
  }, [hovered]);

  return (
    <svg
      ref={ref}
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      className="[transform-box:fill-box] [transform-origin:5.5px_12.5px]"
      {...rest}
    >
      <g fill="currentColor">
        <path
          d="M15.747,2.076l-2.847,.177-5.891,5.891c-.324-.084-.658-.144-1.009-.144-2.209,0-4,1.791-4,4s1.791,4,4,4,4-1.791,4-4c0-.362-.064-.707-.154-1.041l1.904-1.959v-2.25h2.25l1.753-1.645-.006-3.029Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <circle cx="5.5" cy="12.5" fill="currentColor" r="1" stroke="none" />
      </g>
    </svg>
  );
}
