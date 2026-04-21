import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", {
  variants: {
    variant: {
      neutral: "bg-white/6 text-slate-300",
      success: "bg-emerald-400/15 text-emerald-300",
      warning: "bg-amber-400/15 text-amber-300",
      danger: "bg-rose-400/15 text-rose-300",
      accent: "bg-sky-400/15 text-sky-300",
    },
  },
  defaultVariants: {
    variant: "neutral",
  },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

