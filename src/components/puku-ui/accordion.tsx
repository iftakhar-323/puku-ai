"use client";
import { Accordion as Base } from "@base-ui/react/accordion";
import type { StyledProps } from "./puku-theme";
import "./puku.css";
export function Accordion({ className, ...props }: StyledProps<typeof Base.Root>) {
  return <Base.Root data-ui="" className={`puku-accordion ${className ?? ""}`} {...props} />;
}
export function AccordionItem({ className, ...props }: StyledProps<typeof Base.Item>) {
  return <Base.Item data-ui="" className={`puku-accordion-item ${className ?? ""}`} {...props} />;
}
export function AccordionTrigger({
  children,
  className,
  ...props
}: StyledProps<typeof Base.Trigger>) {
  return (
    <Base.Header>
      <Base.Trigger className={`puku-accordion-trigger ${className ?? ""}`} {...props}>
        {children}
        <span aria-hidden="true" className="puku-chevron">
          ⌄
        </span>
      </Base.Trigger>
    </Base.Header>
  );
}
export function AccordionContent({ className, ...props }: StyledProps<typeof Base.Panel>) {
  return <Base.Panel data-ui="" className={`puku-accordion-panel ${className ?? ""}`} {...props} />;
}
