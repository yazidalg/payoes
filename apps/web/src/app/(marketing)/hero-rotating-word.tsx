"use client";

import { cn } from "@/lib/utils";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

const DISPLAY_DURATION_MS = 3500;
const TRANSITION_MS = 500;

const WORD_CLASS =
  "block whitespace-nowrap font-bold text-primary";

type HeroRotatingWordProps = {
  words: readonly string[];
};

function measureTextWidth(element: HTMLSpanElement): number {
  return Math.ceil(element.getBoundingClientRect().width);
}

export function HeroRotatingWord({ words }: HeroRotatingWordProps) {
  const [index, setIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [width, setWidth] = useState<number | undefined>(undefined);
  const measureRef = useRef<HTMLSpanElement>(null);

  const nextIndex = (index + 1) % words.length;
  const activeWord = isTransitioning ? words[nextIndex] : words[index];

  const applyWidthForWord = useCallback((word: string) => {
    const measureEl = measureRef.current;
    if (!measureEl) return;

    measureEl.textContent = word;
    const measuredWidth = measureTextWidth(measureEl);
    if (measuredWidth > 0) {
      setWidth(measuredWidth);
    }
  }, []);

  useLayoutEffect(() => {
    const scheduleMeasure = () => {
      applyWidthForWord(activeWord);
    };

    scheduleMeasure();

    if (document.fonts?.ready) {
      void document.fonts.ready.then(scheduleMeasure);
    }

    window.addEventListener("resize", scheduleMeasure);
    return () => window.removeEventListener("resize", scheduleMeasure);
  }, [activeWord, applyWidthForWord]);

  useEffect(() => {
    if (words.length <= 1 || isTransitioning) return;

    const timeoutId = window.setTimeout(() => {
      applyWidthForWord(words[nextIndex]);
      setIsTransitioning(true);
    }, DISPLAY_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [words, index, isTransitioning, nextIndex, applyWidthForWord]);

  useEffect(() => {
    if (!isTransitioning) return;

    const timeoutId = window.setTimeout(() => {
      setIndex((current) => (current + 1) % words.length);
      setIsTransitioning(false);
    }, TRANSITION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isTransitioning, words.length]);

  return (
    <span
      className="relative inline-block align-bottom overflow-hidden transition-[width] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
      style={{
        width: width !== undefined ? `${width}px` : undefined,
        transitionDuration: `${TRANSITION_MS}ms`,
      }}
    >
      <span
        ref={measureRef}
        className={cn(
          WORD_CLASS,
          "pointer-events-none absolute top-0 left-[-10000px] whitespace-nowrap opacity-0",
        )}
        aria-hidden="true"
      />
      <span className="relative block" aria-live="polite">
        {!isTransitioning ? (
          <span key={words[index]} className={WORD_CLASS}>
            {words[index]}
          </span>
        ) : (
          <>
            <span
              key={`exit-${words[index]}`}
              className={cn(
                WORD_CLASS,
                "motion-safe:animate-[hero-word-exit_var(--hero-word-transition)_cubic-bezier(0.16,1,0.3,1)_forwards]",
                "motion-reduce:opacity-0 motion-reduce:animate-none",
              )}
              style={
                {
                  "--hero-word-transition": `${TRANSITION_MS}ms`,
                } as CSSProperties
              }
            >
              {words[index]}
            </span>
            <span
              key={`enter-${words[nextIndex]}`}
              className={cn(
                WORD_CLASS,
                "absolute inset-x-0 top-0",
                "translate-y-full opacity-0 blur-[2px]",
                "motion-safe:animate-[hero-word-enter_var(--hero-word-transition)_cubic-bezier(0.16,1,0.3,1)_forwards]",
                "motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:blur-0 motion-reduce:animate-none",
              )}
              style={
                {
                  "--hero-word-transition": `${TRANSITION_MS}ms`,
                } as CSSProperties
              }
            >
              {words[nextIndex]}
            </span>
          </>
        )}
      </span>
    </span>
  );
}
