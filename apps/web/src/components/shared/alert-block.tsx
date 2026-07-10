import { Alert, AlertDescription } from "@dub/ui";
import { CircleCheck, CircleInfo, CircleXmark } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { AlertTriangle } from "lucide-react";
import type { ElementType, ReactNode } from "react";

type AlertType = "error" | "warning" | "success" | "info";

const alertConfig: Record<
  AlertType,
  {
    icon: ElementType<{ className?: string }>;
    variant?: "default" | "destructive";
    className?: string;
  }
> = {
  error: {
    icon: CircleXmark,
    variant: "destructive",
  },
  warning: {
    icon: AlertTriangle,
    className:
      "border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-600",
  },
  success: {
    icon: CircleCheck,
    className:
      "border-green-200 bg-green-50 text-green-900 [&>svg]:text-green-600",
  },
  info: {
    icon: CircleInfo,
    className: "border-blue-200 bg-blue-50 text-blue-900 [&>svg]:text-blue-600",
  },
};

interface AlertBlockProps {
  type: AlertType;
  className?: string;
  children: ReactNode;
}

export function AlertBlock({ type, className, children }: AlertBlockProps) {
  const {
    icon: Icon,
    variant = "default",
    className: typeClassName,
  } = alertConfig[type];

  return (
    <Alert
      variant={variant}
      className={cn("py-4 [&>svg]:size-4", typeClassName, className)}
    >
      <Icon className="size-4" />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
