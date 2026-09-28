import type { ComponentProps } from "react";
import "./puku.css";
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden="true" className={`puku-skeleton ${className ?? ""}`} {...props} />;
}
