"use client";
import { Command as Base } from "cmdk";
import type { StyledProps } from "./puku-theme";
import "./puku.css";
export function Command({ className, ...props }: StyledProps<typeof Base>) {
  return <Base data-ui="" className={`puku-command ${className ?? ""}`} {...props} />;
}
export function CommandInput({ className, ...props }: StyledProps<typeof Base.Input>) {
  return <Base.Input className={`puku-input ${className ?? ""}`} {...props} />;
}
export function CommandList({ className, ...props }: StyledProps<typeof Base.List>) {
  return <Base.List className={`puku-command-list ${className ?? ""}`} {...props} />;
}
export function CommandItem({ className, ...props }: StyledProps<typeof Base.Item>) {
  return <Base.Item className={`puku-menu-item ${className ?? ""}`} {...props} />;
}
export function CommandEmpty({ className, ...props }: StyledProps<typeof Base.Empty>) {
  return <Base.Empty className={`puku-menu-empty ${className ?? ""}`} {...props} />;
}
export const CommandGroup = Base.Group;
export const CommandSeparator = Base.Separator;
