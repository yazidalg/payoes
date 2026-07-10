import { SVGProps, useEffect, useRef } from "react";

export function Gauge6({
  "data-hovered": hovered,
  ...rest
}: { "data-hovered"?: boolean } & SVGProps<SVGSVGElement>) {
  const needleRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!needleRef.current) return;

    if (hovered) {
      needleRef.current.animate(
        [
          { transform: "rotate(0deg)" },
          { transform: "rotate(25deg)" },
          { transform: "rotate(-10deg)" },
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
      height="18"
      width="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <g fill="currentColor">
        <circle cx="9" cy="4.75" fill="currentColor" r=".75" stroke="none" />
        <circle
          cx="12.005"
          cy="5.995"
          fill="currentColor"
          r=".75"
          stroke="none"
        />
        <circle cx="13.25" cy="9" fill="currentColor" r=".75" stroke="none" />
        <circle
          cx="5.995"
          cy="5.995"
          fill="currentColor"
          r=".75"
          stroke="none"
        />
        <path
          d="M4.75,9.75c.414,0,.75-.336,.75-.75s-.336-.75-.75-.75-.75,.336-.75,.75,.336,.75,.75,.75Z"
          fill="currentColor"
          stroke="none"
        />
        <path
          d="M12.968,15.063c1.975-1.295,3.282-3.525,3.282-6.063,0-4.004-3.246-7.25-7.25-7.25S1.75,4.996,1.75,9c0,2.538,1.307,4.768,3.282,6.063"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          ref={needleRef}
          d="M7.5,14.75c0-.828,1.5-7,1.5-7,0,0,1.5,6.172,1.5,7s-.672,1.5-1.5,1.5-1.5-.672-1.5-1.5Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          className="[transform-box:fill-box] [transform-origin:9px_14.75px]"
        />
      </g>
    </svg>
  );
}
