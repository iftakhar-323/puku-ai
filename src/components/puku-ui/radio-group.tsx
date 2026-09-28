"use client";
import { RadioGroup as BaseGroup } from "@base-ui/react/radio-group";
import { Radio } from "@base-ui/react/radio";
import type { StyledProps } from "./puku-theme";
import "./puku.css";
export function RadioGroup({ className, ...props }: StyledProps<typeof BaseGroup>) {
  return <BaseGroup data-ui="" className={`puku-stack ${className ?? ""}`} {...props} />;
}
export function RadioGroupItem({ className, ...props }: StyledProps<typeof Radio.Root>) {
  return (
    <Radio.Root className={`puku-radio ${className ?? ""}`} {...props}>
      <Radio.Indicator className="puku-radio-dot" />
    </Radio.Root>
  );
}
