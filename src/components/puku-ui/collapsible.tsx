"use client";
import { Collapsible as Base } from "@base-ui/react/collapsible";
import type { StyledProps } from "./puku-theme";
import "./puku.css";
export function Collapsible({ className, ...props }: StyledProps<typeof Base.Root>) {
  return <Base.Root data-ui="" className={`puku-collapsible ${className ?? ""}`} {...props} />;
}
export function CollapsibleTrigger({ className, ...props }: StyledProps<typeof Base.Trigger>) {
  return <Base.Trigger data-ui="" className={`puku-button ${className ?? ""}`} {...props} />;
}
export function CollapsibleContent({ className, ...props }: StyledProps<typeof Base.Panel>) {
  return <Base.Panel data-ui="" className={`puku-collapse-panel ${className ?? ""}`} {...props} />;
}
