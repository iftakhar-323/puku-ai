"use client";
import { AlertDialog as Base } from "@base-ui/react/alert-dialog";
import {
  usePukuTheme,
  usePukuTokenStyle,
  mergeTokenStyle,
  usePukuNode,
  type StyledProps,
} from "./puku-theme";
import "./puku.css";
export const AlertDialogRoot = Base.Root;
export const AlertDialogClose = Base.Close;
export function AlertDialogTrigger({ className, ...props }: StyledProps<typeof Base.Trigger>) {
  return <Base.Trigger data-ui="" className={`puku-button ${className ?? ""}`} {...props} />;
}
export function AlertDialogTitle({ className, ...props }: StyledProps<typeof Base.Title>) {
  return <Base.Title data-ui="" className={`puku-dialog-title ${className ?? ""}`} {...props} />;
}
export function AlertDialogDescription({
  className,
  ...props
}: StyledProps<typeof Base.Description>) {
  return (
    <Base.Description data-ui="" className={`puku-description ${className ?? ""}`} {...props} />
  );
}
export function AlertDialogContent({
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
      </Base.Popup>
    </Base.Portal>
  );
}
export const AlertDialog = {
  Root: AlertDialogRoot,
  Trigger: AlertDialogTrigger,
  Content: AlertDialogContent,
  Portal: AlertDialogContent,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
  Close: AlertDialogClose,
} as const;
