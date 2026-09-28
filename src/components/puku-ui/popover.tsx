"use client";
import { Popover as Base } from "@base-ui/react/popover";
import {
  usePukuTheme,
  usePukuTokenStyle,
  mergeTokenStyle,
  usePukuNode,
  type StyledProps,
} from "./puku-theme";
import "./puku.css";
export const Popover = Base.Root;
export const PopoverClose = Base.Close;
export function PopoverTrigger({ className, ...props }: StyledProps<typeof Base.Trigger>) {
  return <Base.Trigger data-ui="" className={`puku-button ${className ?? ""}`} {...props} />;
}
export function PopoverTitle({ className, ...props }: StyledProps<typeof Base.Title>) {
  return <Base.Title data-ui="" className={`puku-title ${className ?? ""}`} {...props} />;
}
export function PopoverDescription({ className, ...props }: StyledProps<typeof Base.Description>) {
  return (
    <Base.Description data-ui="" className={`puku-description ${className ?? ""}`} {...props} />
  );
}
export function PopoverContent({
  children,
  className,
  side = "bottom",
  align = "center",
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
          className={`puku-popover ${className ?? ""}`}
          {...props}
          style={mergeTokenStyle(tokenStyle, props.style)}
        >
          {children}
        </Base.Popup>
      </Base.Positioner>
    </Base.Portal>
  );
}
