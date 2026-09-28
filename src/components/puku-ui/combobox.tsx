"use client";
import { Combobox as Base } from "@base-ui/react/combobox";
import {
  usePukuTheme,
  usePukuTokenStyle,
  mergeTokenStyle,
  usePukuNode,
  type StyledProps,
} from "./puku-theme";
import "./puku.css";
export const Combobox = Base.Root;
export const ComboboxList = Base.List;
export function ComboboxInput({ className, ...props }: StyledProps<typeof Base.Input>) {
  return <Base.Input data-ui="" className={`puku-input ${className ?? ""}`} {...props} />;
}
export function ComboboxEmpty({ className, ...props }: StyledProps<typeof Base.Empty>) {
  return <Base.Empty data-ui="" className={`puku-menu-empty ${className ?? ""}`} {...props} />;
}
export function ComboboxContent({ children, className, ...props }: StyledProps<typeof Base.Popup>) {
  const theme = usePukuTheme();
  const tokenStyle = usePukuTokenStyle();
  const node = usePukuNode();
  return (
    <Base.Portal>
      <Base.Positioner sideOffset={6} className="puku-positioner">
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
export function ComboboxItem({ children, className, ...props }: StyledProps<typeof Base.Item>) {
  return (
    <Base.Item className={`puku-menu-item ${className ?? ""}`} {...props}>
      <span className="puku-menu-check">
        <Base.ItemIndicator>✓</Base.ItemIndicator>
      </span>
      {children}
    </Base.Item>
  );
}
