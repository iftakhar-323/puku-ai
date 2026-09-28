import type { ComponentProps } from "react";
import "./puku.css";
export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label data-ui="" className={`puku-label ${className ?? ""}`} {...props} />;
}
