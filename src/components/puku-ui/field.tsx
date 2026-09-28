"use client";
import { Field as Base } from "@base-ui/react/field";
import type { StyledProps } from "./puku-theme";
import "./puku.css";
export function Field({ className, ...props }: StyledProps<typeof Base.Root>) {
  return <Base.Root data-ui="" className={`puku-field ${className ?? ""}`} {...props} />;
}
export function FieldLabel({ className, ...props }: StyledProps<typeof Base.Label>) {
  return <Base.Label data-ui="" className={`puku-label ${className ?? ""}`} {...props} />;
}
export function FieldDescription({ className, ...props }: StyledProps<typeof Base.Description>) {
  return (
    <Base.Description data-ui="" className={`puku-description ${className ?? ""}`} {...props} />
  );
}
export function FieldError({ className, ...props }: StyledProps<typeof Base.Error>) {
  return <Base.Error data-ui="" className={`puku-field-error ${className ?? ""}`} {...props} />;
}
export const FieldControl = Base.Control;
