"use client";
import { ToggleGroup as BaseGroup } from "@base-ui/react/toggle-group";
import type { StyledProps } from "./puku-theme";
import "./puku.css";
export { Toggle as ToggleGroupItem } from "./toggle";
export function ToggleGroup({ className, ...props }: StyledProps<typeof BaseGroup>) {
  return <BaseGroup data-ui="" className={`puku-toggle-group ${className ?? ""}`} {...props} />;
}
