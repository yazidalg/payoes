import { SVGProps, useEffect, useRef } from "react";

export function ArrowsOppositeDirectionX({
  "data-hovered": hovered,
  ...rest
}: { "data-hovered"?: boolean } & SVGProps<SVGSVGElement>) {
  const topLeftRef = useRef<SVGGElement>(null);
  const bottomRightRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!hovered) return;

    topLeftRef.current?.animate(
      [
        { transform: "translate(0, 0)" },
        { transform: "translate(-2px, -2px)" },
        { transform: "translate(0, 0)" },
      ],
      { duration: 300 },
    );

    bottomRightRef.current?.animate(
      [
        { transform: "translate(0, 0)" },
        { transform: "translate(2px, 2px)" },
        { transform: "translate(0, 0)" },
      ],
      { duration: 300 },
    );
  }, [hovered]);

  return (
    <svg
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <g fill="currentColor">
        <g ref={topLeftRef}>
          <polyline
            fill="none"
            points="5.5 9.5 2.25 6.25 5.5 3"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
          <line
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            x1="2.25"
            x2="10.25"
            y1="6.25"
            y2="6.25"
          />
        </g>
        <g ref={bottomRightRef}>
          <polyline
            fill="none"
            points="12.5 15 15.75 11.75 12.5 8.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
          <line
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            x1="15.75"
            x2="7.75"
            y1="11.75"
            y2="11.75"
          />
        </g>
      </g>
    </svg>
  );
}
