"use client";
import { Tooltip as Base } from "@base-ui/react/tooltip";
import {
  usePukuTheme,
  usePukuTokenStyle,
  mergeTokenStyle,
  usePukuNode,
  type StyledProps,
} from "./puku-theme";
import "./puku.css";
export const TooltipProvider = Base.Provider;
export const TooltipRoot = Base.Root;
export function TooltipTrigger({ className, ...props }: StyledProps<typeof Base.Trigger>) {
  return <Base.Trigger data-ui="" className={`puku-button ${className ?? ""}`} {...props} />;
}
export function TooltipContent({
  children,
  className,
  side = "top",
  ...props
}: StyledProps<typeof Base.Popup> & { side?: Base.Positioner.Props["side"] }) {
  const theme = usePukuTheme();
  const tokenStyle = usePukuTokenStyle();
  const node = usePukuNode();
  return (
    <Base.Portal>
      <Base.Positioner side={side} sideOffset={8} className="puku-positioner">
        <Base.Popup
          data-ui=""
          data-puku-theme={theme}
          {...node}
          className={`puku-tooltip ${className ?? ""}`}
          {...props}
          style={mergeTokenStyle(tokenStyle, props.style)}
        >
          {children}
        </Base.Popup>
      </Base.Positioner>
    </Base.Portal>
  );
}
export const Tooltip = {
  Provider: TooltipProvider,
  Root: TooltipRoot,
  Trigger: TooltipTrigger,
  Content: TooltipContent,
} as const;
