import React from 'react';
import {
  DialogClose as SheetClose,
  DialogContent,
  DialogDescription as SheetDescription,
  DialogRoot as Sheet,
  DialogTitle as SheetTitle,
  DialogTrigger as SheetTrigger,
} from './Dialog';
import { StyleProp, ViewStyle } from 'react-native';

export { Sheet, SheetTrigger, SheetTitle, SheetDescription, SheetClose };

export function SheetContent({
  side = 'right',
  children,
  style,
}: {
  side?: 'left' | 'right';
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <DialogContent placement={side} style={style}>
      {children}
    </DialogContent>
  );
}
