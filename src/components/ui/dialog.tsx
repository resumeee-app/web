import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared Tailwind CSS classes for standard entity and branch creation form dialogs.
 * Ensures modals expand to at least 720px on viewports >= 640px while maintaining
 * vertical scrolling constraints and fluid responsiveness on mobile devices.
 */
export const FORM_DIALOG_CONTENT_CLASS =
  "sm:max-w-[720px] max-h-[90vh] overflow-y-auto";

/**
 * Root Dialog component providing WAI-ARIA accessible modal dialog state and context.
 */
export const Dialog = DialogPrimitive.Root;

/**
 * Interactive button or element that opens the associated Dialog.
 */
export const DialogTrigger = DialogPrimitive.Trigger;

/**
 * Portals dialog overlay and content to document body root.
 */
export const DialogPortal = DialogPrimitive.Portal;

/**
 * Accessible button to dismiss and close the active Dialog.
 */
export const DialogClose = DialogPrimitive.Close;

/**
 * Semi-transparent backdrop overlay rendered behind dialog content.
 *
 * @param props - Component attributes including optional className.
 * @param ref - Forwarded HTMLDivElement ref.
 * @returns Rendered overlay element.
 */
export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-all duration-100",
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * Primary modal container rendering dialog content with accessible focus trapping,
 * backdrop blur, animation transitions, and dismiss button.
 *
 * @param props - Component attributes including className and children.
 * @param ref - Forwarded HTMLDivElement ref.
 * @returns Rendered modal dialog content element.
 */
export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 shadow-lg duration-200 sm:rounded-lg",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none text-muted-foreground hover:text-foreground"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

/**
 * Header wrapper for modal title and description elements.
 *
 * @param props - Component attributes including className.
 * @returns Rendered header element.
 */
export const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

/**
 * Footer container for modal action buttons (e.g. submit, cancel).
 *
 * @param props - Component attributes including className.
 * @returns Rendered footer element.
 */
export const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

/**
 * Semantic accessible title for the modal dialog (`aria-labelledby`).
 *
 * @param props - Component attributes including className.
 * @param ref - Forwarded HTMLHeadingElement ref.
 * @returns Rendered dialog title element.
 */
export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-100",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

/**
 * Accessible description text for the dialog (`aria-describedby`).
 *
 * @param props - Component attributes including className.
 * @param ref - Forwarded HTMLParagraphElement ref.
 * @returns Rendered dialog description element.
 */
export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-slate-500 dark:text-slate-300", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
