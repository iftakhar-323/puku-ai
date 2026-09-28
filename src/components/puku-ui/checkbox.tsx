"use client";
import { Checkbox as Base } from "@base-ui/react/checkbox";
import type { StyledProps } from "./puku-theme";
import "./puku.css";
export function Checkbox({ className, ...props }: StyledProps<typeof Base.Root>) {
  return (
    <Base.Root data-ui="" className={`puku-checkbox ${className ?? ""}`} {...props}>
      <Base.Indicator className="puku-check-indicator">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path className="puku-check-mark" d="m3 8 3 3 7-7" />
          <path className="puku-check-mixed" d="M3 8h10" />
        </svg>
      </Base.Indicator>
    </Base.Root>
  );
}
