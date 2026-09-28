import type { ComponentProps } from "react";
import "./puku.css";
export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div data-ui="" className={`puku-card ${className ?? ""}`} {...props} />;
}
export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={`puku-card-header ${className ?? ""}`} {...props} />;
}
export function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return <h3 className={`puku-title ${className ?? ""}`} {...props} />;
}
export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={`puku-description ${className ?? ""}`} {...props} />;
}
export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={`puku-card-content ${className ?? ""}`} {...props} />;
}
export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={`puku-card-footer ${className ?? ""}`} {...props} />;
}
