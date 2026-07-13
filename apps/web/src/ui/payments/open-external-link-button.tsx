import { Button } from "@dub/ui";
import { cn } from "@dub/utils";

export function OpenExternalLinkButton({
  href,
  text,
  className,
}: {
  href: string;
  text: string;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      text={text}
      className={cn("h-9 w-auto", className)}
      onClick={() => window.open(href, "_blank", "noopener,noreferrer")}
    />
  );
}
