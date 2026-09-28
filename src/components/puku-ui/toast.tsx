"use client";
import { Toast as Base } from "@base-ui/react/toast";
import { usePukuTheme, usePukuTokenStyle, usePukuNode } from "./puku-theme";
import "./puku.css";
import type { ComponentProps } from "react";
export const useToast = Base.useToastManager;
export function ToastProvider({ children, ...props }: ComponentProps<typeof Base.Provider>) {
  return (
    <Base.Provider {...props}>
      {children}
      <ToastViewport />
    </Base.Provider>
  );
}
function ToastViewport() {
  const { toasts } = Base.useToastManager();
  const theme = usePukuTheme();
  const tokenStyle = usePukuTokenStyle();
  const node = usePukuNode();
  return (
    <Base.Portal>
      <Base.Viewport
        data-puku-theme={theme}
        style={tokenStyle}
        {...node}
        className="puku-toast-viewport"
      >
        {toasts.map((toast) => (
          <Base.Root data-ui="" key={toast.id} toast={toast} className="puku-toast">
            <Base.Content>
              <Base.Title className="puku-title" />
              <Base.Description className="puku-description" />
              <Base.Action className="puku-button" />
            </Base.Content>
            <Base.Close className="puku-toast-close" aria-label="Dismiss notification">
              ×
            </Base.Close>
          </Base.Root>
        ))}
      </Base.Viewport>
    </Base.Portal>
  );
}
