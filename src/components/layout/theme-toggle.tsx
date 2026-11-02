import * as React from "react";
import { Moon, Sun, Laptop, Check } from "lucide-react";
import { useTheme } from "@/lib/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Accessible theme mode selector dropdown component.
 *
 * @remarks
 * Renders an unstyled Radix DropdownMenu providing options for 'Light', 'Dark', and 'System'
 * themes. Features an accessible icon button trigger with `aria-label="Toggle theme"` and
 * screen-reader-only labels. Operable via keyboard arrow navigation, Space, and Enter.
 *
 * @returns JSX Element rendering the theme dropdown menu.
 */
export function ThemeToggle(): React.JSX.Element {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          className="relative h-9 w-9 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
        >
          {resolvedTheme === "dark" ? (
            <Moon className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Sun className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <Sun className="h-4 w-4" aria-hidden="true" />
            <span>Light</span>
          </span>
          {theme === "light" && <Check className="h-4 w-4 ml-2" aria-hidden="true" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <Moon className="h-4 w-4" aria-hidden="true" />
            <span>Dark</span>
          </span>
          {theme === "dark" && <Check className="h-4 w-4 ml-2" aria-hidden="true" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className="flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <Laptop className="h-4 w-4" aria-hidden="true" />
            <span>System</span>
          </span>
          {theme === "system" && <Check className="h-4 w-4 ml-2" aria-hidden="true" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
