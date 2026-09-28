import type { ComponentProps } from "react";
import "./puku.css";
export function Spinner({
  label = "Loading",
  className,
  ...props
}: ComponentProps<"span"> & { label?: string }) {
  return (
    <span data-ui="" role="status" className={`puku-spinner-wrap ${className ?? ""}`} {...props}>
      <span className="puku-spinner" aria-hidden="true" />
      <span className="puku-sr-only">{label}</span>
    </span>
  );
}
