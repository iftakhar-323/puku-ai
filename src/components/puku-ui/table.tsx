import type { ComponentProps } from "react";
import "./puku.css";
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="puku-table-scroll">
      <table data-ui="" className={`puku-table ${className ?? ""}`} {...props} />
    </div>
  );
}
export function TableHeader(props: ComponentProps<"thead">) {
  return <thead {...props} />;
}
export function TableBody(props: ComponentProps<"tbody">) {
  return <tbody {...props} />;
}
export function TableFooter(props: ComponentProps<"tfoot">) {
  return <tfoot {...props} />;
}
export function TableRow(props: ComponentProps<"tr">) {
  return <tr {...props} />;
}
export function TableHead(props: ComponentProps<"th">) {
  return <th scope="col" {...props} />;
}
export function TableCell(props: ComponentProps<"td">) {
  return <td {...props} />;
}
export function TableCaption(props: ComponentProps<"caption">) {
  return <caption {...props} />;
}
