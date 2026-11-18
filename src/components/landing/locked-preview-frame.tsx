import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Props accepted by {@link LockedPreviewFrame}.
 */
export interface LockedPreviewFrameProps {
  /** Accessible label describing the read-only preview canvas. */
  label: string;
  /** Value changing whenever preview DOM content mutates so non-focusable lock stays synchronized. */
  syncKey?: string | number | boolean;
  /** Optional flag to hide background preview subtree from assistive technology when covered by an inline dialog. */
  ariaHidden?: boolean;
  /** Optional custom class names. */
  className?: string;
  /** Previewed application component subtree. */
  children: React.ReactNode;
}

const INTERACTIVE_WIDGET_SELECTOR = "button, input, select, textarea, a";
const FOCUSABLE_EXTRA_SELECTOR = "iframe, pre, [tabindex]";
const PREVIEW_INTERACTIVE_SELECTOR = '[data-preview-interactive="true"]';

function isAllowedPreviewInteractive(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(PREVIEW_INTERACTIVE_SELECTOR) !== null
  );
}

function stopInteraction(event: React.SyntheticEvent): void {
  if (isAllowedPreviewInteractive(event.target)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
}

/**
 * Wraps real application components in a strictly read-only preview frame.
 *
 * Keeps semantic headings, badges, score meters, and text fully readable by
 * assistive technologies while preventing pointer activation and removing
 * internal widgets from the keyboard Tab order unless explicitly opted in via
 * `data-preview-interactive="true"`.
 */
export const LockedPreviewFrame: React.FC<LockedPreviewFrameProps> = ({
  label,
  syncKey,
  ariaHidden = false,
  className,
  children,
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const widgets = root.querySelectorAll<HTMLElement>(INTERACTIVE_WIDGET_SELECTOR);
    widgets.forEach((el) => {
      if (isAllowedPreviewInteractive(el)) {
        return;
      }
      el.tabIndex = -1;
      el.setAttribute("aria-disabled", "true");
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.readOnly = true;
      }
    });

    const extraFocusables = root.querySelectorAll<HTMLElement>(FOCUSABLE_EXTRA_SELECTOR);
    extraFocusables.forEach((el) => {
      if (isAllowedPreviewInteractive(el)) {
        return;
      }
      el.tabIndex = -1;
    });
  }, [syncKey, children]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={label}
      aria-hidden={ariaHidden || undefined}
      onClickCapture={stopInteraction}
      onChangeCapture={stopInteraction}
      onSubmitCapture={stopInteraction}
      onKeyDownCapture={stopInteraction}
      className={cn("pointer-events-none select-none", className)}
    >
      {children}
    </div>
  );
};
