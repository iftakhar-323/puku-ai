"use client";
import { Select as Base } from "@base-ui/react/select";
import {
  usePukuTheme,
  usePukuTokenStyle,
  mergeTokenStyle,
  usePukuNode,
  type StyledProps,
} from "./puku-theme";
import "./puku.css";
export const Select = Base.Root;
export const SelectValue = Base.Value;
export const SelectGroup = Base.Group;
export function SelectLabel({ className, ...props }: StyledProps<typeof Base.GroupLabel>) {
  return <Base.GroupLabel data-ui="" className={`puku-menu-label ${className ?? ""}`} {...props} />;
}
export function SelectTrigger({ children, className, ...props }: StyledProps<typeof Base.Trigger>) {
  return (
    <Base.Trigger
      data-ui=""
      className={`puku-select-trigger puku-input ${className ?? ""}`}
      {...props}
    >
      {children}
      <Base.Icon aria-hidden="true">⌄</Base.Icon>
    </Base.Trigger>
  );
}
export function SelectContent({ children, className, ...props }: StyledProps<typeof Base.Popup>) {
  const theme = usePukuTheme();
  const tokenStyle = usePukuTokenStyle();
  const node = usePukuNode();
  return (
    <Base.Portal>
      <Base.Positioner sideOffset={6} alignItemWithTrigger={false} className="puku-positioner">
        <Base.Popup
          data-ui=""
          data-puku-theme={theme}
          {...node}
          className={`puku-menu puku-select-popup ${className ?? ""}`}
          {...props}
          style={mergeTokenStyle(tokenStyle, props.style)}
        >
          <Base.ScrollUpArrow className="puku-select-scroll">⌃</Base.ScrollUpArrow>
          <Base.List>{children}</Base.List>
          <Base.ScrollDownArrow className="puku-select-scroll">⌄</Base.ScrollDownArrow>
        </Base.Popup>
      </Base.Positioner>
    </Base.Portal>
  );
}
export function SelectItem({ children, className, ...props }: StyledProps<typeof Base.Item>) {
  return (
    <Base.Item className={`puku-menu-item ${className ?? ""}`} {...props}>
      <span className="puku-menu-check">
        <Base.ItemIndicator>✓</Base.ItemIndicator>
      </span>
      <Base.ItemText>{children}</Base.ItemText>
    </Base.Item>
  );
}
