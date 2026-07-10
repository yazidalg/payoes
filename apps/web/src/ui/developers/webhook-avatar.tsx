import { cn } from "@dub/utils";

export function WebhookAvatar({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  return (
    <img
      src={`https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(id)}`}
      alt=""
      className={cn("size-6 rounded-full", className)}
      draggable={false}
    />
  );
}
