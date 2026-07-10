import { Button } from "@dub/ui";
import { Xmark } from "@dub/ui/icons";
import Link from "next/link";

export function CloseInviteButton({
  goToOnboarding,
  variant = "x",
}: {
  goToOnboarding?: boolean;
  variant?: "x" | "full";
}) {
  return (
    <Link href={goToOnboarding ? "/onboarding" : "/dashboard"}>
      <Button
        variant={variant === "x" ? "outline" : "primary"}
        icon={
          variant === "x" ? (
            <Xmark className="text-content-subtle size-5" />
          ) : undefined
        }
        className={
          variant === "x"
            ? "size-8 p-0 active:scale-95"
            : "h-9 w-fit rounded-lg"
        }
        text={variant === "x" ? undefined : "Go back"}
      />
    </Link>
  );
}
