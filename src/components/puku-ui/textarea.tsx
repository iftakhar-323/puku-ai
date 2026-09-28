import type { ComponentProps } from "react";
import "./puku.css";
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea data-ui="" className={`puku-input puku-textarea ${className ?? ""}`} {...props} />
  );
}
