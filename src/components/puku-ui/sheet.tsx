"use client";
import type { ComponentProps } from "react";
import { DialogContent } from "./dialog";
export {
  DialogRoot as Sheet,
  DialogTrigger as SheetTrigger,
  DialogTitle as SheetTitle,
  DialogDescription as SheetDescription,
  DialogClose as SheetClose,
} from "./dialog";
export function SheetContent({
  side = "right",
  ...props
}: Omit<ComponentProps<typeof DialogContent>, "placement"> & { side?: "left" | "right" }) {
  return <DialogContent placement={side} {...props} />;
}
