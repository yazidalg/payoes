import { SVGProps, useEffect, useRef } from "react";

export function Webhook({
  "data-hovered": hovered,
  ...rest
}: { "data-hovered"?: boolean } & SVGProps<SVGSVGElement>) {
  const dot1Ref = useRef<SVGCircleElement>(null);
  const dot2Ref = useRef<SVGCircleElement>(null);
  const dot3Ref = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!hovered) return;

    [dot1Ref, dot2Ref, dot3Ref].forEach((ref, idx) => {
      ref.current?.animate(
        [
          { transform: "scale(1)" },
          { transform: "scale(1.3)" },
          { transform: "scale(1)" },
        ],
        {
          delay: idx * 60,
          duration: 300,
        },
      );
    });
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
          d="M3.804,13.278l3.721-6.444c-.91-.515-1.524-1.492-1.524-2.613,0-1.657,1.343-3,3-3s3,1.343,3,3c0,.08-.003,.159-.009,.237"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M14.246,13.25H6.805c.009,1.046-.53,2.065-1.5,2.626-1.435,.828-3.27,.337-4.098-1.098s-.337-3.27,1.098-4.098c.069-.04,.139-.077,.21-.11"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <path
          d="M9,4.222l3.72,6.444c.901-.531,2.054-.574,3.025-.014,1.435,.828,1.927,2.663,1.098,4.098s-2.663,1.927-4.098,1.098c-.069-.04-.136-.082-.2-.126"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
        <circle
          ref={dot1Ref}
          cx="3.804"
          cy="13.278"
          fill="currentColor"
          r="1.25"
          stroke="none"
          className="[transform-box:fill-box] [transform-origin:center]"
        />
        <circle
          ref={dot2Ref}
          cx="9"
          cy="4.222"
          fill="currentColor"
          r="1.25"
          stroke="none"
          className="[transform-box:fill-box] [transform-origin:center]"
        />
        <circle
          ref={dot3Ref}
          cx="14.248"
          cy="13.252"
          fill="currentColor"
          r="1.25"
          stroke="none"
          className="[transform-box:fill-box] [transform-origin:center]"
        />
      </g>
    </svg>
  );
}
