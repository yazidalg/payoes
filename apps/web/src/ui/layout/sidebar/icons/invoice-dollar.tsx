import { SVGProps, useEffect, useRef } from "react";

export function InvoiceDollar({
  "data-hovered": hovered,
  strokeWidth = 1.5,
  ...rest
}: { "data-hovered"?: boolean } & SVGProps<SVGSVGElement>) {
  const documentRef = useRef<SVGPathElement>(null);
  const dollarRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!hovered) return;

    documentRef.current?.animate(
      [
        { transform: "rotate(0deg)" },
        { transform: "rotate(-4deg)" },
        { transform: "rotate(0deg)" },
      ],
      { duration: 300 },
    );

    dollarRef.current?.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.12)" },
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
        <path
          ref={documentRef}
          d="M14.75,3.75v12.5l-2.75-1.5-3,1.5-3-1.5-2.75,1.5V3.75c0-1.105,.895-2,2-2h7.5c1.105,0,2,.895,2,2Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          className="[transform-box:fill-box] [transform-origin:center]"
        />
        <path
          ref={dollarRef}
          d="M10.724,6.556c-.374-.885-1.122-1.086-1.688-1.086-.526,0-1.907,.28-1.779,1.606,.09,.931,.967,1.277,1.734,1.414s1.88,.429,1.907,1.551c.023,.949-.83,1.597-1.861,1.597-.985,0-1.67-.383-1.934-1.25"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          className="[transform-box:fill-box] [transform-origin:9px_9px]"
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          x1="9"
          x2="9"
          y1="4.75"
          y2="5.47"
        />
        <line
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={strokeWidth}
          x1="9"
          x2="9"
          y1="11.638"
          y2="12.25"
        />
      </g>
    </svg>
  );
}
