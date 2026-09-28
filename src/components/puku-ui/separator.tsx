import type { ComponentProps } from "react";
import "./puku.css";
export function Separator({ className, ...props }: ComponentProps<"hr">) {
  return <hr data-ui="" className={`puku-separator ${className ?? ""}`} {...props} />;
}
