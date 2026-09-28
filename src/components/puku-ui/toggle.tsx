"use client";
import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import type { StyledProps } from "./puku-theme";
import "./puku.css";
export function Toggle({ className, ...props }: StyledProps<typeof BaseToggle>) {
  return <BaseToggle data-ui="" className={`puku-toggle ${className ?? ""}`} {...props} />;
}
