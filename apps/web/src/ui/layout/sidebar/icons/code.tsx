import { SVGProps, useEffect, useRef } from "react";

export function Code({
  "data-hovered": hovered,
  ...rest
}: { "data-hovered"?: boolean } & SVGProps<SVGSVGElement>) {
  const leftRef = useRef<SVGPolylineElement>(null);
  const rightRef = useRef<SVGPolylineElement>(null);
  const slashRef = useRef<SVGLineElement>(null);

  useEffect(() => {
    if (!hovered) return;

    leftRef.current?.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-2px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 300 },
    );

    rightRef.current?.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(2px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 300 },
    );

    slashRef.current?.animate(
      [
        { transform: "rotate(0deg)" },
        { transform: "rotate(8deg)" },
        { transform: "rotate(0deg)" },
      ],
      { duration: 300 },
    );
  }, [hovered]);

  return (
    <svg viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" {...rest}>
      <g fill="currentColor">
        <polyline
          ref={leftRef}
          fill="none"
          points="5.25 12.5 1.75 9 5.25 5.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          className="[transform-box:fill-box] [transform-origin:center]"
        />
        <polyline
          ref={rightRef}
          fill="none"
          points="12.75 12.5 16.25 9 12.75 5.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          className="[transform-box:fill-box] [transform-origin:center]"
        />
        <line
          ref={slashRef}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          x1="7.5"
          x2="10.5"
          y1="15.25"
          y2="2.75"
          className="[transform-box:fill-box] [transform-origin:center]"
        />
      </g>
    </svg>
  );
}
