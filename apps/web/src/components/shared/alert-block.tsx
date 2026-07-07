import * as React from "react";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertType = "error" | "warning" | "success" | "info";

const alertConfig: Record<
  AlertType,
  { icon: React.ElementType; className: string }
> = {
  error: {
    icon: XCircle,
    className: "bg-red-50 border-red-200 text-red-800",
  },
  warning: {
    icon: AlertTriangle,
    className: "bg-yellow-50 border-yellow-200 text-yellow-800",
  },
  success: {
    icon: CheckCircle,
    className: "bg-green-50 border-green-200 text-green-800",
  },
  info: {
    icon: Info,
    className: "bg-blue-50 border-blue-200 text-blue-800",
  },
};

interface AlertBlockProps {
  type: AlertType;
  className?: string;
  children: React.ReactNode;
}

export function AlertBlock({ type, className, children }: AlertBlockProps) {
  const { icon: Icon, className: typeClassName } = alertConfig[type];

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border p-3 text-sm",
        typeClassName,
        className
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
