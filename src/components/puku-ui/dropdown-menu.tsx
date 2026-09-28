"use client";
import { Menu as Base } from "@base-ui/react/menu";
import {
  usePukuTheme,
  usePukuTokenStyle,
  mergeTokenStyle,
  usePukuNode,
  type StyledProps,
} from "./puku-theme";
import "./puku.css";
export const DropdownMenu = Base.Root;
export const DropdownMenuGroup = Base.Group;
export const DropdownMenuRadioGroup = Base.RadioGroup;
export const DropdownMenuSub = Base.SubmenuRoot;
export function DropdownMenuTrigger({ className, ...props }: StyledProps<typeof Base.Trigger>) {
  return <Base.Trigger data-ui="" className={`puku-button ${className ?? ""}`} {...props} />;
}
export function DropdownMenuLabel({ className, ...props }: StyledProps<typeof Base.GroupLabel>) {
  return <Base.GroupLabel data-ui="" className={`puku-menu-label ${className ?? ""}`} {...props} />;
}
export function DropdownMenuItem({ className, ...props }: StyledProps<typeof Base.Item>) {
  return <Base.Item data-ui="" className={`puku-menu-item ${className ?? ""}`} {...props} />;
}
export function DropdownMenuSeparator({ className, ...props }: StyledProps<typeof Base.Separator>) {
  return <Base.Separator data-ui="" className={`puku-separator ${className ?? ""}`} {...props} />;
}
export function DropdownMenuSubTrigger({
  className,
  ...props
}: StyledProps<typeof Base.SubmenuTrigger>) {
  return (
    <Base.SubmenuTrigger data-ui="" className={`puku-menu-item ${className ?? ""}`} {...props} />
  );
}
export function DropdownMenuContent({
  children,
  className,
  side = "bottom",
  align = "start",
  ...props
}: StyledProps<typeof Base.Popup> & {
  side?: Base.Positioner.Props["side"];
  align?: Base.Positioner.Props["align"];
}) {
  const theme = usePukuTheme();
  const tokenStyle = usePukuTokenStyle();
  const node = usePukuNode();
  return (
    <Base.Portal>
      <Base.Positioner side={side} align={align} sideOffset={8} className="puku-positioner">
        <Base.Popup
          data-ui=""
          data-puku-theme={theme}
          {...node}
          className={`puku-menu ${className ?? ""}`}
          {...props}
          style={mergeTokenStyle(tokenStyle, props.style)}
        >
          {children}
        </Base.Popup>
      </Base.Positioner>
    </Base.Portal>
  );
}
export function DropdownMenuCheckboxItem({
  children,
  className,
  ...props
}: StyledProps<typeof Base.CheckboxItem>) {
  return (
    <Base.CheckboxItem className={`puku-menu-item ${className ?? ""}`} {...props}>
      <span className="puku-menu-check">
        <Base.CheckboxItemIndicator>✓</Base.CheckboxItemIndicator>
      </span>
      {children}
    </Base.CheckboxItem>
  );
}
export function DropdownMenuRadioItem({
  children,
  className,
  ...props
}: StyledProps<typeof Base.RadioItem>) {
  return (
    <Base.RadioItem className={`puku-menu-item ${className ?? ""}`} {...props}>
      <span className="puku-menu-check">
        <Base.RadioItemIndicator>●</Base.RadioItemIndicator>
      </span>
      {children}
    </Base.RadioItem>
  );
}
