import { SVGProps, useEffect, useRef } from "react";

export function MoneyBill2({
  "data-hovered": hovered,
  ...rest
}: { "data-hovered"?: boolean } & SVGProps<SVGSVGElement>) {
  const billRef = useRef<SVGPathElement>(null);
  const circleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!hovered) return;

    billRef.current?.animate(
      [
        { transform: "scaleY(1)" },
        { transform: "scaleY(0.92)" },
        { transform: "scaleY(1)" },
      ],
      { duration: 300 },
    );

    circleRef.current?.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.15)" },
        { transform: "scale(1)" },
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
        <circle
          ref={circleRef}
          cx="9"
          cy="9"
          fill="none"
          r="2"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          className="[transform-box:fill-box] [transform-origin:center]"
        />
        <path
          ref={billRef}
          d="M1.75,13.75V4.25c2.396,1.074,4.568,1.221,7.25,0s4.854-1.25,7.25,0V13.75c-2.396-1.25-4.568-1.221-7.25,0s-4.854,1.074-7.25,0Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          className="[transform-box:fill-box] [transform-origin:center]"
        />
      </g>
    </svg>
  );
}
