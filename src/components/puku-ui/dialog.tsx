"use client";
import { Dialog as Base } from "@base-ui/react/dialog";
import {
  usePukuTheme,
  usePukuTokenStyle,
  mergeTokenStyle,
  usePukuNode,
  type StyledProps,
} from "./puku-theme";
import "./puku.css";
export const DialogRoot = Base.Root;
export const DialogClose = Base.Close;
export function DialogTrigger({ className, ...props }: StyledProps<typeof Base.Trigger>) {
  return <Base.Trigger data-ui="" className={`puku-button ${className ?? ""}`} {...props} />;
}
export function DialogTitle({ className, ...props }: StyledProps<typeof Base.Title>) {
  return <Base.Title data-ui="" className={`puku-dialog-title ${className ?? ""}`} {...props} />;
}
export function DialogDescription({ className, ...props }: StyledProps<typeof Base.Description>) {
  return (
    <Base.Description data-ui="" className={`puku-description ${className ?? ""}`} {...props} />
  );
}
export function DialogContent({
  children,
  className,
  placement = "center",
  ...props
}: StyledProps<typeof Base.Popup> & { placement?: "center" | "left" | "right" }) {
  const theme = usePukuTheme();
  const tokenStyle = usePukuTokenStyle();
  const node = usePukuNode();
  return (
    <Base.Portal>
      <Base.Backdrop className="puku-backdrop" style={tokenStyle} />
      <Base.Popup
        data-ui=""
        data-puku-theme={theme}
        {...node}
        data-placement={placement}
        className={`puku-dialog ${className ?? ""}`}
        {...props}
        style={mergeTokenStyle(tokenStyle, props.style)}
      >
        {children}
        <Base.Close
          className="puku-dialog-close puku-button"
          data-variant="ghost"
          data-size="icon"
          aria-label="Close dialog"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="m6 6 12 12M6 18 18 6" />
          </svg>
        </Base.Close>
      </Base.Popup>
    </Base.Portal>
  );
}
export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Content: DialogContent,
  Portal: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
} as const;
