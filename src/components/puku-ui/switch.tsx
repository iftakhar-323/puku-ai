"use client";
import { Switch as Base } from "@base-ui/react/switch";
import type { StyledProps } from "./puku-theme";
import "./puku.css";
export function Switch({ className, ...props }: StyledProps<typeof Base.Root>) {
  return (
    <Base.Root data-ui="" className={`puku-switch ${className ?? ""}`} {...props}>
      <Base.Thumb className="puku-switch-thumb" />
    </Base.Root>
  );
}
