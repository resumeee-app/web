/**
 * @file template-code-editor.tsx
 * @description Code editor component for composing and editing Go template sets across
 * HTML, CSS, Markdown, and Plain Text formats. Includes real-time client-side syntax
 * validation and actionable line/column diagnostics for template actions and conditionals.
 *
 * Accessibility & WAI-ARIA Considerations:
 * - Built on top of Radix UI Tabs primitives (`@radix-ui/react-tabs`) with roving tabindex
 *   and keyboard arrow key navigation.
 * - Every `<textarea>` element is linked directly to an accessible label via `htmlFor` and `id`.
 * - Syntax errors and diagnostics are announced to assistive technologies via an accessible
 *   `role="alert"` live region.
 */

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Props for the TemplateCodeEditor component.
 */
export interface TemplateCodeEditorProps {
  /** The Go HTML template source code string. */
  htmlTemplate: string;
  /** The CSS stylesheet string. */
  cssStyles: string;
  /** The Go Markdown template source code string. */
  markdownTemplate: string;
  /** The Go Plain Text template source code string. */
  textTemplate: string;
  /** Callback fired whenever any of the template or style fields are modified. */
  onChange: (fields: {
    htmlTemplate?: string;
    cssStyles?: string;
    markdownTemplate?: string;
    textTemplate?: string;
  }) => void;
  /** Whether the editor is in read-only mode (e.g., when viewing built-in templates). */
  readOnly?: boolean;
  /** Server-side syntax or validation error diagnostics returned from the API. */
  serverError?: { message?: string; details?: string } | null;
  /** Optional custom CSS classes for the container. */
  className?: string;
}

/**
 * Represents a localized syntax error diagnostic.
 */
export interface SyntaxDiagnostic {
  /** 1-based line number of the syntax anomaly. */
  line: number;
  /** Optional 1-based column offset. */
  column?: number;
  /** Human-readable explanation of the syntax violation. */
  message: string;
}

/**
 * Validates Go template syntax for unclosed tags, unmatched blocks, or unclosed conditions.
 * Inspects actions such as `if`, `range`, `with`, `block`, and `define` and asserts matching `end` tags.
 *
 * @param content - Template code string to validate.
 * @returns A SyntaxDiagnostic if an error is detected, or null if syntax is structurally valid.
 */
export function validateGoTemplateSyntax(content: string): SyntaxDiagnostic | null {
  if (!content) return null;

  const lines = content.split("\n");
  const blockStack: { type: string; line: number }[] = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineNum = lineIdx + 1;
    const line = lines[lineIdx];
    if (line === undefined) continue;

    // Check for unclosed template tags: "{{" without "}}"
    let searchPos = 0;
    while (searchPos < line.length) {
      const openTag = line.indexOf("{{", searchPos);
      if (openTag === -1) break;

      const closeTag = line.indexOf("}}", openTag + 2);
      if (closeTag === -1) {
        return {
          line: lineNum,
          column: openTag + 1,
          message: `Unclosed template action "{{" at line ${lineNum}, column ${openTag + 1}`,
        };
      }

      // Check block actions
      const tagContent = line.slice(openTag + 2, closeTag).trim();
      const parts = tagContent.split(/\s+/);
      const action = parts[0];

      if (action === "if" || action === "range" || action === "with" || action === "block" || action === "define") {
        blockStack.push({ type: action, line: lineNum });
      } else if (action === "end") {
        if (blockStack.length === 0) {
          return {
            line: lineNum,
            column: openTag + 1,
            message: `Unexpected "{{end}}" with no matching opening block at line ${lineNum}`,
          };
        }
        blockStack.pop();
      }

      searchPos = closeTag + 2;
    }
  }

  if (blockStack.length > 0) {
    const unclosed = blockStack[blockStack.length - 1];
    if (unclosed) {
      return {
        line: unclosed.line,
        message: `Unclosed condition or block "{{${unclosed.type}}}" opened at line ${unclosed.line} with no matching "{{end}}"`,
      };
    }
  }

  return null;
}

/**
 * Multi-tab code editor for Go templates and stylesheets.
 *
 * Architectural Role:
 * Embeds within TemplateForm and TemplateEditorPage to supply syntax validation,
 * tab switching across formats, and accessible editing surfaces.
 *
 * @param props - Component props satisfying TemplateCodeEditorProps.
 * @returns JSX element representing the tabbed code editor.
 */
export const TemplateCodeEditor: React.FC<TemplateCodeEditorProps> = ({
  htmlTemplate,
  cssStyles,
  markdownTemplate,
  textTemplate,
  onChange,
  readOnly = false,
  serverError,
  className,
}) => {
  const [activeTab, setActiveTab] = React.useState<string>("html");

  // Validate active template tab
  const activeContent = React.useMemo(() => {
    switch (activeTab) {
      case "html":
        return htmlTemplate;
      case "css":
        return cssStyles;
      case "markdown":
        return markdownTemplate;
      case "text":
        return textTemplate;
      default:
        return "";
    }
  }, [activeTab, htmlTemplate, cssStyles, markdownTemplate, textTemplate]);

  const clientDiagnostic = React.useMemo(() => {
    // Only validate Go template syntax for template tabs (not plain CSS)
    if (activeTab === "css") return null;
    return validateGoTemplateSyntax(activeContent);
  }, [activeTab, activeContent]);

  const activeError = serverError?.details || serverError?.message || clientDiagnostic?.message;

  return (
    <div className={cn("flex flex-col space-y-3", className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="html" className="text-xs font-medium">
              HTML Template
            </TabsTrigger>
            <TabsTrigger value="css" className="text-xs font-medium">
              CSS Styles
            </TabsTrigger>
            <TabsTrigger value="markdown" className="text-xs font-medium">
              Markdown
            </TabsTrigger>
            <TabsTrigger value="text" className="text-xs font-medium">
              Plain Text
            </TabsTrigger>
          </TabsList>

          {/* Syntax validation status indicator */}
          <div className="flex items-center space-x-1.5 text-xs">
            {activeError ? (
              <span className="flex items-center text-red-600 font-medium">
                <AlertCircle className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Syntax Diagnostic
              </span>
            ) : (
              <span className="flex items-center text-emerald-600 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Syntax Valid
              </span>
            )}
          </div>
        </div>

        {/* Actionable Error Alert Diagnostic */}
        {activeError && (
          <div
            role="alert"
            className="mt-2.5 flex items-start space-x-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <span className="font-semibold">Go Template Syntax Error: </span>
              <span>{activeError}</span>
              {clientDiagnostic?.line && (
                <div className="mt-1 text-xs text-red-600 font-mono">
                  Line {clientDiagnostic.line}
                  {clientDiagnostic.column ? `, Column ${clientDiagnostic.column}` : ""}
                </div>
              )}
            </div>
          </div>
        )}

        {/* HTML Tab */}
        <TabsContent value="html" className="mt-2 focus-visible:outline-none">
          <label htmlFor="html-template-editor" className="sr-only">
            HTML Template Code
          </label>
          <textarea
            id="html-template-editor"
            value={htmlTemplate}
            onChange={(e) => onChange({ htmlTemplate: e.target.value })}
            readOnly={readOnly}
            spellCheck={false}
            rows={14}
            className={cn(
              "w-full rounded-md border border-slate-300 bg-slate-900 p-3 font-mono text-xs text-emerald-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500",
              readOnly && "opacity-80 cursor-not-allowed bg-slate-800"
            )}
            placeholder="<!DOCTYPE html><html>...<h1>{{.FullName}}</h1>...</html>"
          />
        </TabsContent>

        {/* CSS Tab */}
        <TabsContent value="css" className="mt-2 focus-visible:outline-none">
          <label htmlFor="css-styles-editor" className="sr-only">
            CSS Stylesheet
          </label>
          <textarea
            id="css-styles-editor"
            value={cssStyles}
            onChange={(e) => onChange({ cssStyles: e.target.value })}
            readOnly={readOnly}
            spellCheck={false}
            rows={14}
            className={cn(
              "w-full rounded-md border border-slate-300 bg-slate-900 p-3 font-mono text-xs text-sky-300 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500",
              readOnly && "opacity-80 cursor-not-allowed bg-slate-800"
            )}
            placeholder="body { font-family: sans-serif; } .header { color: #2563eb; }"
          />
        </TabsContent>

        {/* Markdown Tab */}
        <TabsContent value="markdown" className="mt-2 focus-visible:outline-none">
          <label htmlFor="markdown-template-editor" className="sr-only">
            Markdown Template Code
          </label>
          <textarea
            id="markdown-template-editor"
            value={markdownTemplate}
            onChange={(e) => onChange({ markdownTemplate: e.target.value })}
            readOnly={readOnly}
            spellCheck={false}
            rows={14}
            className={cn(
              "w-full rounded-md border border-slate-300 bg-slate-900 p-3 font-mono text-xs text-amber-300 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500",
              readOnly && "opacity-80 cursor-not-allowed bg-slate-800"
            )}
            placeholder="# {{.FullName}}\n## {{.Headline}}\n\n- {{.Email}}"
          />
        </TabsContent>

        {/* Plain Text Tab */}
        <TabsContent value="text" className="mt-2 focus-visible:outline-none">
          <label htmlFor="text-template-editor" className="sr-only">
            Plain Text Template Code
          </label>
          <textarea
            id="text-template-editor"
            value={textTemplate}
            onChange={(e) => onChange({ textTemplate: e.target.value })}
            readOnly={readOnly}
            spellCheck={false}
            rows={14}
            className={cn(
              "w-full rounded-md border border-slate-300 bg-slate-900 p-3 font-mono text-xs text-slate-100 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500",
              readOnly && "opacity-80 cursor-not-allowed bg-slate-800"
            )}
            placeholder="{{.FullName}}\n{{.Headline}}\n{{.Email}} | {{.Phone}}"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
