import { Avatar } from "@dub/ui";

export function CustomerAvatar({
  customer,
  className,
}: {
  customer: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
  className?: string;
}) {
  return (
    <Avatar
      identifier={customer.id || customer.name || customer.email || "Unknown"}
      className={className}
    />
  );
}
