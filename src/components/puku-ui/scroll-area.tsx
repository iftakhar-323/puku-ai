"use client";
import { ScrollArea as Base } from "@base-ui/react/scroll-area";
import type { StyledProps } from "./puku-theme";
import "./puku.css";
export function ScrollArea({ children, className, ...props }: StyledProps<typeof Base.Root>) {
  return (
    <Base.Root data-ui="" className={`puku-scroll-area ${className ?? ""}`} {...props}>
      <Base.Viewport className="puku-scroll-viewport">
        <Base.Content>{children}</Base.Content>
      </Base.Viewport>
      <Base.Scrollbar className="puku-scrollbar">
        <Base.Thumb className="puku-scroll-thumb" />
      </Base.Scrollbar>
      <Base.Scrollbar orientation="horizontal" className="puku-scrollbar">
        <Base.Thumb className="puku-scroll-thumb" />
      </Base.Scrollbar>
      <Base.Corner />
    </Base.Root>
  );
}
