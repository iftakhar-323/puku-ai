"use client";
import { Slider as Base } from "@base-ui/react/slider";
import type { StyledProps } from "./puku-theme";
import "./puku.css";
export function Slider({ className, ...props }: StyledProps<typeof Base.Root>) {
  return (
    <Base.Root data-ui="" className={`puku-slider ${className ?? ""}`} {...props}>
      <Base.Control className="puku-slider-control">
        <Base.Track className="puku-slider-track">
          <Base.Indicator className="puku-slider-indicator" />
          <Base.Thumb className="puku-slider-thumb" />
        </Base.Track>
      </Base.Control>
    </Base.Root>
  );
}
