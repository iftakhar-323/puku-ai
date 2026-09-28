import type { ComponentProps } from "react";
import "./puku.css";
export function Fieldset({ className, ...props }: ComponentProps<"fieldset">) {
  return <fieldset data-ui="" className={`puku-fieldset ${className ?? ""}`} {...props} />;
}
export function FieldsetLegend({ className, ...props }: ComponentProps<"legend">) {
  return <legend className={`puku-title ${className ?? ""}`} {...props} />;
}
export function FieldsetDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={`puku-description ${className ?? ""}`} {...props} />;
}
