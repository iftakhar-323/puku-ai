import type { ComponentProps } from "react";
import "./puku.css";
export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return <kbd data-ui="" className={`puku-kbd ${className ?? ""}`} {...props} />;
}
