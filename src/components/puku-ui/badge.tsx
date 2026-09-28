import type { ComponentProps } from "react";
import "./puku.css";
export type BadgeVariant =
  | "default"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "destructive";
export function Badge({
  variant = "default",
  className,
  ...props
}: ComponentProps<"span"> & { variant?: BadgeVariant }) {
  return (
    <span
      data-ui=""
      data-variant={variant}
      className={`puku-badge ${className ?? ""}`}
      {...props}
    />
  );
}
