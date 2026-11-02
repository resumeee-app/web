import * as React from "react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";
import { useToast } from "./use-toast";

/**
 * Global toaster container component that mounts {@link ToastProvider} and renders active toasts.
 *
 * @remarks
 * Should be mounted once at the root level of the application shell (e.g. inside {@link RootLayout}).
 * Uses Radix Toast primitives to provide accessible polite notifications.
 *
 * @returns JSX Element rendering the active toast notifications and viewport.
 */
export function Toaster(): React.JSX.Element {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
