/**
 * @file template-editor-page.tsx
 * @description Split-screen template builder and code editor page (`/templates/:id` and `/templates/new`).
 * Provides real-time Go template code editing on the left and live sandboxed iframe preview on the right.
 *
 * Immutability & Safety Invariant:
 * System built-in templates are immutable and cannot be updated. When viewing a built-in template,
 * an informational warning banner is displayed, form controls are locked into read-only mode,
 * the save action is disabled, and a prominent "Duplicate as Custom" action is offered.
 *
 * Security Invariant:
 * The live preview output is rendered inside a strictly sandboxed `<iframe>` (`sandbox=""`, `srcdoc`),
 * ensuring no scripts can execute from user-supplied templates.
 *
 * Accessibility & WAI-ARIA Considerations:
 * - Landmark `<main id="main-content">` containing `<h1>` heading.
 * - Live syntax error diagnostics are rendered in an accessible `role="alert"` container.
 * - Immutability warning is announced with `role="status"`.
 * - All buttons and form controls have explicit accessible names and focus-visible indicators.
 */

import * as React from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Copy,
  ShieldAlert,
  Loader2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  isBuiltInTemplate,
} from "@/api/template-queries";
import { TemplateMetadataCard } from "@/components/templates/template-metadata-card";
import { TemplateCodeEditor } from "@/components/templates/template-code-editor";
import { TemplatePreviewPane } from "@/components/templates/template-preview-pane";
import { TemplateReferenceDrawer } from "@/components/templates/template-reference-drawer";

/**
 * Starter Go HTML template used when creating a new custom template set from scratch.
 */
const DEFAULT_STARTER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{{.FullName}} - Resume</title>
  <style>{{.CSSStyles}}</style>
</head>
<body>
  <main class="resume">
    <header>
      <h1>{{.FullName}}</h1>
      <p class="headline">{{.Headline}}</p>
      <div class="contact">
        <span>{{.Email}}</span> | <span>{{.Phone}}</span> | <span>{{.Location.City}}, {{.Location.Region}}</span>
      </div>
    </header>
    <section class="summary">
      <h2>Professional Summary</h2>
      <p>{{.Summary}}</p>
    </section>
  </main>
</body>
</html>`;

/**
 * Starter CSS stylesheet used when creating a new custom template set from scratch.
 */
const DEFAULT_STARTER_CSS = `*, *::before, *::after { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.5; color: #1e293b; padding: 24px; background: #ffffff; }
.resume { max-width: 800px; margin: 0 auto; }
h1 { font-size: 26px; color: #0f172a; margin-bottom: 4px; }
.headline { font-size: 15px; color: #64748b; margin-bottom: 8px; }
.contact { font-size: 13px; color: #475569; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 16px; }
h2 { font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 16px; margin-bottom: 8px; }
p { font-size: 14px; margin-bottom: 8px; }`;

/**
 * Starter Markdown template used when creating a new custom template set from scratch.
 */
const DEFAULT_STARTER_MD = `# {{.FullName}}
**{{.Headline}}**

{{.Email}} | {{.Phone}} | {{.Location.City}}, {{.Location.Region}}

## Professional Summary
{{.Summary}}`;

/**
 * Starter Plain Text template used when creating a new custom template set from scratch.
 */
const DEFAULT_STARTER_TXT = `{{.FullName}}
{{.Headline}}
{{.Email}} | {{.Phone}} | {{.Location.City}}, {{.Location.Region}}

==================================================
PROFESSIONAL SUMMARY
==================================================
{{.Summary}}`;

/**
 * Template Editor and Custom Builder page component.
 *
 * Architectural Role:
 * Handles `/templates/:id` (and `/templates/new`). Manages split-screen editing,
 * debounced live previews, duplicate flows, Go template syntax checks, and API mutations.
 *
 * @returns JSX element representing the template editor view.
 */
export const TemplateEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isNew = !id || id === "new";
  const duplicateId = searchParams.get("duplicate");

  // Load existing template if editing
  const {
    data: existingTemplate,
    isLoading: isTemplateLoading,
    error: loadError,
  } = useTemplate(isNew ? undefined : id);

  // Load template to duplicate if duplicating
  const { data: duplicateSource } = useTemplate(duplicateId || undefined);

  // Mutations
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();

  // Form state
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [htmlTemplate, setHtmlTemplate] = React.useState(DEFAULT_STARTER_HTML);
  const [cssStyles, setCssStyles] = React.useState(DEFAULT_STARTER_CSS);
  const [markdownTemplate, setMarkdownTemplate] = React.useState(DEFAULT_STARTER_MD);
  const [textTemplate, setTextTemplate] = React.useState(DEFAULT_STARTER_TXT);

  // Live debounced preview state
  const [debouncedHtml, setDebouncedHtml] = React.useState(htmlTemplate);
  const [debouncedCss, setDebouncedCss] = React.useState(cssStyles);
  const [debouncedMd, setDebouncedMd] = React.useState(markdownTemplate);
  const [debouncedTxt, setDebouncedTxt] = React.useState(textTemplate);
  const [isDebouncing, setIsDebouncing] = React.useState(false);

  // Server error diagnostic state
  const [serverError, setServerError] = React.useState<{ message?: string; details?: string } | null>(null);

  // Template placeholder reference drawer state
  const [isReferenceOpen, setIsReferenceOpen] = React.useState(false);

  // Check if viewing an immutable built-in template
  const isBuiltIn = React.useMemo(() => {
    if (isNew) return false;
    return isBuiltInTemplate(existingTemplate);
  }, [isNew, existingTemplate]);

  // Prepopulate from existing template
  React.useEffect(() => {
    if (existingTemplate && !isNew) {
      setName(existingTemplate.name);
      setDescription(existingTemplate.description || "");
      setHtmlTemplate(existingTemplate.html_template || "");
      setCssStyles(existingTemplate.css_styles || "");
      setMarkdownTemplate(existingTemplate.markdown_template || "");
      setTextTemplate(existingTemplate.text_template || "");
    }
  }, [existingTemplate, isNew]);

  // Prepopulate from duplicate source
  React.useEffect(() => {
    if (duplicateSource && isNew) {
      setName(`Copy of ${duplicateSource.name}`);
      setDescription(duplicateSource.description || "");
      setHtmlTemplate(duplicateSource.html_template || "");
      setCssStyles(duplicateSource.css_styles || "");
      setMarkdownTemplate(duplicateSource.markdown_template || "");
      setTextTemplate(duplicateSource.text_template || "");
    }
  }, [duplicateSource, isNew]);

  // Debounced sync for live preview
  React.useEffect(() => {
    setIsDebouncing(true);
    const timer = setTimeout(() => {
      setDebouncedHtml(htmlTemplate);
      setDebouncedCss(cssStyles);
      setDebouncedMd(markdownTemplate);
      setDebouncedTxt(textTemplate);
      setIsDebouncing(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [htmlTemplate, cssStyles, markdownTemplate, textTemplate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBuiltIn) return; // Invariant protection

    setServerError(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      html_template: htmlTemplate,
      css_styles: cssStyles,
      markdown_template: markdownTemplate,
      text_template: textTemplate,
    };

    try {
      if (isNew) {
        await createMutation.mutateAsync(payload);
      } else if (id) {
        await updateMutation.mutateAsync({
          id,
          payload,
        });
      } else {
        return;
      }
      navigate("/templates");
    } catch (err: unknown) {
      const errorObj = err as { message?: string; details?: string };
      setServerError({
        message: errorObj.message,
        details: errorObj.details,
      });
    }
  };

  const handleDuplicateToNew = () => {
    navigate(`/templates/new?duplicate=${id}`);
  };

  if (!isNew && isTemplateLoading) {
    return (
      <main id="main-content" className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6">
        <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-300">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <p className="mt-3 text-sm">Loading template details...</p>
        </div>
      </main>
    );
  }

  if (!isNew && loadError) {
    return (
      <main id="main-content" className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6">
        <div className="mx-auto max-w-xl rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-200">Failed to load template</h2>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">{(loadError as Error).message}</p>
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link to="/templates">Return to Templates Catalog</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const canSave = !isBuiltIn && name.trim().length > 0 && !isSaving;

  return (
    <main id="main-content" className="min-h-screen bg-slate-50 dark:bg-slate-950 py-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Top Navigation & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <Button asChild variant="ghost" size="sm" className="h-8 px-2">
              <Link to="/templates" className="flex items-center text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100">
                <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
                <span>Back to Templates</span>
              </Link>
            </Button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 sm:text-2xl">
              {isNew
                ? "Create Template Set"
                : isBuiltIn
                ? `View Built-in Template: ${name || "Standard"}`
                : `Edit Template: ${name || "Custom"}`}
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsReferenceOpen(true)}
              aria-label="Open template placeholder reference guide"
              aria-haspopup="dialog"
              aria-expanded={isReferenceOpen}
              aria-controls="template-reference-drawer"
              className="text-xs"
            >
              <BookOpen className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Placeholder Hints
            </Button>

            {isBuiltIn && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDuplicateToNew}
                className="text-xs"
              >
                <Copy className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                Duplicate as Custom
              </Button>
            )}

            <Button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="text-xs"
            >
              <Save className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              {isSaving
                ? "Saving..."
                : isNew
                ? "Save Template"
                : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Immutability Warning Banner for Built-in Templates */}
        {isBuiltIn && (
          <div
            role="status"
            className="mt-4 flex items-center space-x-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm text-amber-900 dark:text-amber-200 shadow-sm"
          >
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" aria-hidden="true" />
            <p>
              <strong className="font-semibold">Immutable Template:</strong> Built-in templates are immutable and cannot be modified. Use &quot;Duplicate as Custom&quot; to create an editable copy.
            </p>
          </div>
        )}

        {/* Full-width Template Metadata Box (100% width of parent container) */}
        <TemplateMetadataCard
          name={name}
          description={description}
          onChange={(updates) => {
            if (updates.name !== undefined) setName(updates.name);
            if (updates.description !== undefined) setDescription(updates.description);
            setServerError(null);
          }}
          readOnly={isBuiltIn}
          className="mt-6"
        />

        {/* Ergonomic Split Screen Layout: Code Editor on Left, Live Preview on Right */}
        <div
          data-testid="template-split-container"
          className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2"
        >
          {/* Left Column: Code Editor */}
          <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm h-full">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              Template Definition
            </span>
            <TemplateCodeEditor
              htmlTemplate={htmlTemplate}
              cssStyles={cssStyles}
              markdownTemplate={markdownTemplate}
              textTemplate={textTemplate}
              onChange={(updates) => {
                if (updates.htmlTemplate !== undefined) setHtmlTemplate(updates.htmlTemplate);
                if (updates.cssStyles !== undefined) setCssStyles(updates.cssStyles);
                if (updates.markdownTemplate !== undefined) setMarkdownTemplate(updates.markdownTemplate);
                if (updates.textTemplate !== undefined) setTextTemplate(updates.textTemplate);
                setServerError(null);
              }}
              readOnly={isBuiltIn}
              serverError={serverError}
              onOpenReference={() => setIsReferenceOpen(true)}
              isReferenceOpen={isReferenceOpen}
            />
          </div>

          {/* Right Column: Live Sandboxed Iframe Preview */}
          <div className="flex flex-col h-full min-h-[500px]">
            <TemplatePreviewPane
              htmlTemplate={debouncedHtml}
              cssStyles={debouncedCss}
              markdownTemplate={debouncedMd}
              textTemplate={debouncedTxt}
              isDebouncing={isDebouncing}
              className="h-full"
            />
          </div>
        </div>
      </div>

      {/* Go Template Placeholder Reference & Hints Drawer */}
      <TemplateReferenceDrawer
        open={isReferenceOpen}
        onOpenChange={setIsReferenceOpen}
      />
    </main>
  );
};
