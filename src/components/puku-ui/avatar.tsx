"use client";
import { Avatar as Base } from "@base-ui/react/avatar";
import type { StyledProps } from "./puku-theme";
import "./puku.css";
export function Avatar({ className, ...props }: StyledProps<typeof Base.Root>) {
  return <Base.Root data-ui="" className={`puku-avatar ${className ?? ""}`} {...props} />;
}
export function AvatarImage({ className, ...props }: StyledProps<typeof Base.Image>) {
  return <Base.Image data-ui="" className={`puku-avatar-image ${className ?? ""}`} {...props} />;
}
export function AvatarFallback({ className, ...props }: StyledProps<typeof Base.Fallback>) {
  return (
    <Base.Fallback data-ui="" className={`puku-avatar-fallback ${className ?? ""}`} {...props} />
  );
}
