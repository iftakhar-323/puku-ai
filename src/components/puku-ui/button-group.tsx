import type { ComponentProps } from "react";
import "./puku.css";
export function ButtonGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div data-ui="" role="group" className={`puku-button-group ${className ?? ""}`} {...props} />
  );
}
