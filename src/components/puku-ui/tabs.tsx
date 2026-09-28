"use client";
import { Tabs as Base } from "@base-ui/react/tabs";
import type { StyledProps } from "./puku-theme";
import "./puku.css";
export function Tabs({ className, ...props }: StyledProps<typeof Base.Root>) {
  return <Base.Root data-ui="" className={`puku-tabs ${className ?? ""}`} {...props} />;
}
export function TabsList({ className, ...props }: StyledProps<typeof Base.List>) {
  return (
    <Base.List
      activateOnFocus
      data-ui=""
      className={`puku-tabs-list ${className ?? ""}`}
      {...props}
    />
  );
}
export function TabsTrigger({ className, ...props }: StyledProps<typeof Base.Tab>) {
  return <Base.Tab data-ui="" className={`puku-tab ${className ?? ""}`} {...props} />;
}
export function TabsContent({ className, ...props }: StyledProps<typeof Base.Panel>) {
  return <Base.Panel data-ui="" className={`puku-tabs-panel ${className ?? ""}`} {...props} />;
}
