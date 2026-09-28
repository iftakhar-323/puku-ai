import type { ComponentProps } from "react";
import { Input } from "./input";
import "./puku.css";
export function InputGroup({ className, ...props }: ComponentProps<"div">) {
  return <div data-ui="" className={`puku-input-group ${className ?? ""}`} {...props} />;
}
export function InputGroupAddon({ className, ...props }: ComponentProps<"span">) {
  return <span className={`puku-input-addon ${className ?? ""}`} {...props} />;
}
export function InputGroupInput(props: ComponentProps<typeof Input>) {
  return <Input {...props} />;
}
