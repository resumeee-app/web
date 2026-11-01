import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-indigo-600 text-white shadow hover:bg-indigo-700 focus-visible:ring-indigo-500",
  destructive:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500",
  outline:
    "border border-slate-300 bg-white shadow-sm hover:bg-slate-100 text-slate-900 focus-visible:ring-slate-400",
  secondary:
    "bg-slate-100 text-slate-900 shadow-sm hover:bg-slate-200 focus-visible:ring-slate-400",
  ghost:
    "hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400",
  link: "text-indigo-600 underline-offset-4 hover:underline focus-visible:ring-indigo-500",
};

const sizeStyles: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-9 px-4 py-2 text-sm",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-8 text-base",
  icon: "h-9 w-9",
};

export function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
} = {}): string {
  return cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    variantStyles[variant],
    sizeStyles[size],
    className
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
