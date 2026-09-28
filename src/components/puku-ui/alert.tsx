import type { ComponentProps } from "react";
import "./puku.css";
export function Alert({
  variant = "default",
  className,
  ...props
}: ComponentProps<"div"> & { variant?: "default" | "success" | "warning" | "destructive" }) {
  return (
    <div
      data-ui=""
      role="status"
      data-variant={variant}
      className={`puku-alert ${className ?? ""}`}
      {...props}
    />
  );
}
export function AlertTitle({ className, ...props }: ComponentProps<"h3">) {
  return <h3 className={`puku-title ${className ?? ""}`} {...props} />;
}
export function AlertDescription({ className, ...props }: ComponentProps<"div">) {
  return <div className={`puku-description ${className ?? ""}`} {...props} />;
}
