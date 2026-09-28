import type { ComponentProps } from "react";
import "./puku.css";
export function Pagination(props: ComponentProps<"nav">) {
  return <nav data-ui="" aria-label="Pagination" {...props} />;
}
export function PaginationContent({ className, ...props }: ComponentProps<"ul">) {
  return <ul className={`puku-pagination ${className ?? ""}`} {...props} />;
}
export function PaginationItem(props: ComponentProps<"li">) {
  return <li {...props} />;
}
export function PaginationLink({
  active,
  className,
  ...props
}: ComponentProps<"a"> & { active?: boolean }) {
  return (
    <a
      aria-current={active ? "page" : undefined}
      className={`puku-button ${className ?? ""}`}
      data-variant={active ? "secondary" : "ghost"}
      data-size="sm"
      {...props}
    />
  );
}
