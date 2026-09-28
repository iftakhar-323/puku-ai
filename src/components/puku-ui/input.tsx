"use client";
import { Input as BaseInput } from "@base-ui/react/input";
import type { StyledProps } from "./puku-theme";
import "./puku.css";
export function Input({
  invalid,
  className,
  ...props
}: StyledProps<typeof BaseInput> & { invalid?: boolean }) {
  return (
    <BaseInput
      data-ui=""
      aria-invalid={invalid || undefined}
      className={`puku-input ${className ?? ""}`}
      {...props}
    />
  );
}
