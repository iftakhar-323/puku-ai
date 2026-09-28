"use client";
import { Progress as Base } from "@base-ui/react/progress";
import type { StyledProps } from "./puku-theme";
import "./puku.css";
export function Progress({ className, ...props }: StyledProps<typeof Base.Root>) {
  return (
    <Base.Root data-ui="" className={`puku-progress ${className ?? ""}`} {...props}>
      <Base.Track className="puku-progress-track">
        <Base.Indicator className="puku-progress-indicator" />
      </Base.Track>
    </Base.Root>
  );
}
