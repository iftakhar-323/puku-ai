"use client";
import { Button as BaseButton } from "@base-ui/react/button";
import type { StyledProps } from "./puku-theme";
import "./puku.css";

export type ButtonProps = StyledProps<typeof BaseButton> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";
  size?: "sm" | "md" | "lg" | "icon";
};
export function Button({ variant = "default", size = "md", className, ...props }: ButtonProps) {
  return (
    <BaseButton
      data-ui=""
      data-variant={variant}
      data-size={size}
      className={`puku-button ${className ?? ""}`}
      {...props}
    />
  );
}
