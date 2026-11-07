import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Gauge, AlertTriangle, AlertCircle, RefreshCw, X } from "lucide-react";
import { useQuota } from "@/api/quota-queries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Format an ISO timestamp string into a localized time and date string.
 */
function formatResetTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      return "soon";
    }
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "soon";
  }
}

/**
 * Props for {@link QuotaMeter}.
 */
export interface QuotaMeterProps {
  /** Optional additional CSS class names */
  className?: string;
}

/**
 * Accessible header navigation widget rendering the tenant's LLM generation quota and usage metrics.
 *
 * @remarks
 * Architecture & Accessibility:
 * - Displays a compact status pill showing daily requests used / limit.
 * - Colors dynamically transition to warning (amber) when usage >= 80% and destructive (red) when >= 100%.
 * - Clicking the pill opens an accessible Radix popover detailing daily request and monthly token capacity,
 *   remaining credits, and exact window reset timestamps.
 * - Progress bars implement standard ARIA `progressbar` semantics (`role`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`).
 */
export const QuotaMeter: React.FC<QuotaMeterProps> = ({ className }) => {
  const { data: quota, isLoading, isError, refetch } = useQuota();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading LLM quota"
        className={cn(
          "flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 animate-pulse text-slate-400",
          className
        )}
      >
        <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Quota:</span>
        <span>--/--</span>
      </div>
    );
  }

  if (isError || !quota) {
    return (
      <div
        className={cn(
          "flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500",
          className
        )}
      >
        <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Quota:</span>
        <span>Unavailable</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 ml-1"
          onClick={() => void refetch()}
          aria-label="Retry fetching quota"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  const dailyUsed = quota.daily_requests_used ?? 0;
  const dailyLimit = quota.daily_request_limit > 0 ? quota.daily_request_limit : 50;
  const dailyRemaining = quota.daily_requests_remaining ?? Math.max(0, dailyLimit - dailyUsed);
  const dailyPercent = Math.min(100, Math.round((dailyUsed / dailyLimit) * 100));

  const monthlyTokensUsed = quota.monthly_tokens_used ?? 0;
  const monthlyTokenLimit = quota.monthly_token_limit > 0 ? quota.monthly_token_limit : 1000000;
  const monthlyTokensRemaining =
    quota.monthly_tokens_remaining ?? Math.max(0, monthlyTokenLimit - monthlyTokensUsed);
  const monthlyPercent = Math.min(
    100,
    Math.round((monthlyTokensUsed / monthlyTokenLimit) * 100)
  );

  const isExceeded = dailyPercent >= 100 || monthlyPercent >= 100;
  const isWarning = !isExceeded && (dailyPercent >= 80 || monthlyPercent >= 80);

  const triggerStatusStyles = isExceeded
    ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/60"
    : isWarning
    ? "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60"
    : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800";

  const dotColor = isExceeded
    ? "bg-red-500"
    : isWarning
    ? "bg-amber-500"
    : "bg-emerald-500";

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={`LLM Quota: ${dailyUsed} of ${dailyLimit} daily requests used. Click for details.`}
          className={cn(
            "flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
            triggerStatusStyles,
            className
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", dotColor)} aria-hidden="true" />
          <span className="hidden sm:inline">Quota:</span>
          <span className="font-semibold tabular-nums">
            {dailyUsed}/{dailyLimit}
          </span>
          {isExceeded && <AlertCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" aria-hidden="true" />}
          {isWarning && <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 shadow-lg text-slate-900 dark:text-slate-100 focus:outline-none animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Gauge className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                LLM Quota & Limits
              </h2>
            </div>
            <PopoverPrimitive.Close asChild>
              <button
                type="button"
                aria-label="Close quota details"
                className="rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </PopoverPrimitive.Close>
          </div>

          <div className="space-y-4 pt-3">
            {/* Daily Requests */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Daily Requests
                </span>
                <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {dailyUsed} / {dailyLimit}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Daily request quota usage"
                aria-valuenow={dailyUsed}
                aria-valuemin={0}
                aria-valuemax={dailyLimit}
                className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
              >
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    dailyPercent >= 100
                      ? "bg-red-500"
                      : dailyPercent >= 80
                      ? "bg-amber-500"
                      : "bg-indigo-600 dark:bg-indigo-500"
                  )}
                  style={{ width: `${dailyPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>{dailyRemaining} remaining</span>
                <span>Resets {formatResetTime(quota.daily_reset_at)}</span>
              </div>
            </div>

            {/* Monthly Tokens */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Monthly Tokens
                </span>
                <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {monthlyTokensUsed.toLocaleString()} / {monthlyTokenLimit.toLocaleString()}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Monthly token quota usage"
                aria-valuenow={monthlyTokensUsed}
                aria-valuemin={0}
                aria-valuemax={monthlyTokenLimit}
                className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
              >
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    monthlyPercent >= 100
                      ? "bg-red-500"
                      : monthlyPercent >= 80
                      ? "bg-amber-500"
                      : "bg-indigo-600 dark:bg-indigo-500"
                  )}
                  style={{ width: `${monthlyPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>{monthlyTokensRemaining.toLocaleString()} remaining</span>
                <span>Resets {formatResetTime(quota.monthly_reset_at)}</span>
              </div>
            </div>

            {isExceeded && (
              <div
                role="alert"
                className="p-2 rounded bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start space-x-1.5"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  Quota ceiling exceeded. LLM operations will return HTTP 429 until the reset window.
                </span>
              </div>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};
