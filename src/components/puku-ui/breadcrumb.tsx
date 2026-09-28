import type { ComponentProps } from "react";
import "./puku.css";
export function Breadcrumb(props: ComponentProps<"nav">) {
  return <nav data-ui="" aria-label="Breadcrumb" {...props} />;
}
export function BreadcrumbList({ className, ...props }: ComponentProps<"ol">) {
  return <ol className={`puku-breadcrumb ${className ?? ""}`} {...props} />;
}
export function BreadcrumbItem(props: ComponentProps<"li">) {
  return <li {...props} />;
}
export function BreadcrumbLink(props: ComponentProps<"a">) {
  return <a {...props} />;
}
export function BreadcrumbPage(props: ComponentProps<"span">) {
  return <span aria-current="page" {...props} />;
}
export function BreadcrumbSeparator(props: ComponentProps<"li">) {
  return (
    <li aria-hidden="true" {...props}>
      /
    </li>
  );
}
