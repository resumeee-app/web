import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Root provider configuring the Radix Toast viewport context.
 */
export const ToastProvider = ToastPrimitives.Provider;

/**
 * Fixed container element rendering active toasts in an accessible polite live region.
 */
export const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

/**
 * Props accepted by the {@link Toast} component.
 */
export interface ToastProps
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> {
  /**
   * Visual and semantic presentation variant:
   * - `default`: Standard notification surface (neutral background).
   * - `destructive`: Error notification with high-contrast red background and white text.
   * - `success`: Confirmation notification with green background and white text.
   */
  variant?: "default" | "destructive" | "success";
}

const variantStyles: Record<NonNullable<ToastProps["variant"]>, string> = {
  default:
    "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-950 dark:text-slate-50 shadow-lg",
  destructive:
    "border-red-600 bg-red-600 text-white shadow-lg dark:border-red-700 dark:bg-red-700",
  success:
    "border-green-600 bg-green-600 text-white shadow-lg dark:border-green-700 dark:bg-green-700",
};

/**
 * Accessible toast notification card built upon `@radix-ui/react-toast`.
 *
 * @remarks
 * Supports touch/mouse swipe-to-dismiss, automatic timeout, and keyboard navigation.
 *
 * @param props - Component props as defined by {@link ToastProps}.
 * @param ref - Forwarded ref to the Radix Root element.
 * @returns An accessible toast card JSX element.
 */
export const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  ToastProps
>(({ className, variant = "default", ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md p-4 pr-8 shadow-lg transition-all",
        "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full sm:data-[state=open]:slide-in-from-bottom-full",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

/**
 * Interactive button rendered inside a toast card to perform an immediate action (e.g., Undo, Retry).
 */
export const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-transparent px-3 text-sm font-medium transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

/**
 * Accessible close button dismissing the active toast.
 */
export const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-slate-500 opacity-70 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-indigo-500",
      "group-[.destructive]:text-red-100 group-[.destructive]:hover:text-white",
      className
    )}
    toast-close=""
    aria-label="Close"
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

/**
 * Primary title text rendered inside a toast notification.
 */
export const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold [&+div]:text-xs", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

/**
 * Secondary description or detail text rendered inside a toast notification.
 */
export const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

/**
 * Element type for the action button inside a toast.
 */
export type ToastActionElement = React.ReactElement<typeof ToastAction>;
