import { cn } from "@dub/utils";
import { Wordmark } from "./wordmark";

export function CompositeLogo({ className }: { className?: string }) {
  return <Wordmark className={className} />;
}
