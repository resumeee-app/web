/**
 * @file resume-preview-page.tsx
 * @description Live Resume Preview, Diff Viewer & ATS Export Page.
 *
 * Provides a dual-pane tabbed view toggling between a live sandboxed
 * rendered resume preview (Letter/A4, HTML/Markdown/plain-text)
 * and a visual tailored diff viewer highlighting additions, omissions,
 * and prioritized skills. Integrates the ATS Export Engine toolbar
 * for direct downloads of HTML, Markdown, Plain Text, and standard JSON Resume.
 *
 * Accessibility / WAI-ARIA Considerations:
 * - Implements Radix UI Tabs with roving tabindex and keyboard navigation.
 * - Semantic landmarks: main container, level-1 headings, toolbar, and status live regions.
 * - Conforms to WCAG 2.1 AA with zero axe violations.
 */

import * as React from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ExportToolbar } from "@/components/preview/export-toolbar";
import { ResumeViewer } from "@/components/preview/resume-viewer";
import { DiffViewer } from "@/components/preview/diff-viewer";
import {
  useBranch,
  useBranchVersions,
  useBranchVersion,
  useBranchVersionPreview,
  useFullProfile,
  getBranchVersionExportUrl,
  type ExportFormat,
} from "@/api/render-queries";

/**
 * Props for ResumePreviewPage component.
 */
export interface ResumePreviewPageProps {
  /** Optional custom class name applied to page container */
  className?: string;
}

/**
 * ResumePreviewPage presents the live rendered resume preview and tailored diff.
 *
 * @param props - Component configuration props.
 * @returns Accessible page component for branch resume inspection and export.
 */
export const ResumePreviewPage: React.FC<ResumePreviewPageProps> = ({
  className = "",
}) => {
  const { id: routeBranchId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const branchId = routeBranchId || "";

  const versionParam = searchParams.get("version");
  const tabParam = searchParams.get("tab");
  const parsedVersion = versionParam ? parseInt(versionParam, 10) : NaN;
  const initialVersion =
    !Number.isNaN(parsedVersion) && parsedVersion > 0 ? parsedVersion : undefined;
  const initialTab = tabParam === "diff" ? "diff" : "preview";

  // Query server state via TanStack Query hooks
  const {
    data: branch,
    isLoading: isBranchLoading,
    isError: isBranchError,
    error: branchError,
  } = useBranch(branchId);

  const {
    data: versions = [],
    isLoading: isVersionsLoading,
  } = useBranchVersions(branchId);

  const { data: masterProfile } = useFullProfile();

  // Active view tab state (Rendered Resume vs Tailoring Diff)
  const [activeTab, setActiveTab] = React.useState<string>(initialTab);

  // Active version selection state
  const [selectedVersionNumber, setSelectedVersionNumber] = React.useState<
    number | undefined
  >(initialVersion);

  // Track initialVersion parameter changes across external navigations
  const prevInitialVersionRef = React.useRef(initialVersion);
  React.useEffect(() => {
    if (initialVersion !== prevInitialVersionRef.current) {
      prevInitialVersionRef.current = initialVersion;
      if (initialVersion !== undefined) {
        setSelectedVersionNumber(initialVersion);
      }
    }
  }, [initialVersion]);

  // Automatically select the active or latest version upon data arrival if none is selected
  React.useEffect(() => {
    if (selectedVersionNumber !== undefined) {
      return;
    }
    if (versions.length > 0) {
      if (branch?.active_version_id) {
        const activeVer = versions.find((v) => v.id === branch.active_version_id);
        if (activeVer) {
          setSelectedVersionNumber(activeVer.version_number);
          return;
        }
      }
      // Fallback: pick the latest completed version, or the last in the array
      const latestCompleted = [...versions]
        .filter((v) => v.status === "completed")
        .sort((a, b) => b.version_number - a.version_number)[0];

      if (latestCompleted) {
        setSelectedVersionNumber(latestCompleted.version_number);
      } else {
        const lastVersion = versions[versions.length - 1];
        if (lastVersion) {
          setSelectedVersionNumber(lastVersion.version_number);
        }
      }
    }
  }, [versions, branch, selectedVersionNumber]);

  // Fetch full details of the currently selected version
  const {
    data: activeVersion,
    isLoading: isVersionDetailsLoading,
  } = useBranchVersion(branchId, selectedVersionNumber);

  // Fetch Go server-rendered outputs for the branch version preview
  const {
    data: previewOutputs,
    isLoading: isPreviewLoading,
  } = useBranchVersionPreview(branchId, selectedVersionNumber);

  // Loading state handling
  if (isBranchLoading || isVersionsLoading) {
    return (
      <main className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[50vh]">
        <div
          role="status"
          aria-label="Loading resume preview"
          className="flex flex-col items-center gap-3 text-slate-600 dark:text-slate-400"
        >
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <p className="text-sm font-medium">Loading resume preview and tailoring data...</p>
        </div>
      </main>
    );
  }

  // Error state handling
  if (isBranchError || !branch) {
    return (
      <main className="container mx-auto px-4 py-12">
        <div
          role="alert"
          className="max-w-lg mx-auto p-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-900 dark:text-red-200"
        >
          <div className="flex items-center gap-2 mb-2 font-semibold">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
            <span>Unable to load resume branch</span>
          </div>
          <p className="text-sm mb-4">
            {branchError?.message || "The requested resume branch could not be found."}
          </p>
          <Link
            to="/branches"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Branches</span>
          </Link>
        </div>
      </main>
    );
  }

  /**
   * Constructs the export download URL for a specified format, or '#' if no version is selected.
   *
   * @param format - Export format ('html' | 'markdown' | 'text' | 'jsonresume')
   * @returns Fully qualified relative URL or fallback anchor
   */
  const getExportUrl = (format: ExportFormat): string => {
    return selectedVersionNumber !== undefined
      ? getBranchVersionExportUrl(branchId, selectedVersionNumber, format)
      : "#";
  };

  return (
    <main className={`container mx-auto px-4 py-6 max-w-7xl ${className}`}>
      {/* Navigation Breadcrumb / Return Link */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <li>
            <Link
              to="/branches"
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
            >
              Branches
            </Link>
          </li>
          <li aria-hidden="true" className="text-slate-400 dark:text-slate-600">
            /
          </li>
          <li>
            <Link
              to={branchId ? `/branches/${branchId}` : "/branches"}
              className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Workbench</span>
            </Link>
          </li>
        </ol>
      </nav>

      {/* Top Header Section: Title, Target Details, Version Picker, Export Toolbar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {branch.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-600 dark:text-slate-400">
            {branch.target_role && (
              <span className="font-medium text-slate-900 dark:text-slate-100">{branch.target_role}</span>
            )}
            {branch.target_company && (
              <>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span>{branch.target_company}</span>
              </>
            )}
            {branch.template_set_id && (
              <>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">Template: {branch.template_set_id}</span>
              </>
            )}
          </div>
        </div>

        {/* Right side: Version Selection Dropdown & Export Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Version Selector (if multiple versions exist) */}
          {versions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="resume-version-select"
                className="text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Version:
              </label>
              <select
                id="resume-version-select"
                value={selectedVersionNumber ?? ""}
                onChange={(e) => setSelectedVersionNumber(Number(e.target.value))}
                aria-label="Select resume version"
                className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {versions.map((ver) => (
                  <option key={ver.id} value={ver.version_number}>
                    v{ver.version_number} ({ver.status})
                    {ver.id === branch.active_version_id ? " [Active]" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ATS Export Toolbar */}
          <ExportToolbar
            htmlDownloadUrl={getExportUrl("html")}
            textDownloadUrl={getExportUrl("text")}
            jsonResumeDownloadUrl={getExportUrl("jsonresume")}
            branchName={branch.name}
            versionNumber={selectedVersionNumber ?? 1}
          />
        </div>
      </header>

      {/* Main Tabs Container: Rendered Resume vs Tailoring Diff */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="mb-4" aria-label="Resume preview tabs">
          <TabsTrigger value="preview" className="text-sm font-medium">
            Rendered Resume
          </TabsTrigger>
          <TabsTrigger value="diff" className="text-sm font-medium">
            Tailoring Diff
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Live Rendered Resume Preview */}
        <TabsContent value="preview" className="focus-visible:outline-none">
          {isVersionDetailsLoading || isPreviewLoading ? (
            <div
              role="status"
              aria-label="Loading version outputs"
              className="flex justify-center p-12 text-slate-500 dark:text-slate-400 text-sm"
            >
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400 mr-2" />
              Loading rendered resume...
            </div>
          ) : (
            <ResumeViewer
              htmlContent={previewOutputs?.html || activeVersion?.html_output || ""}
              markdownContent={previewOutputs?.markdown || activeVersion?.markdown_output || ""}
              plainTextContent={previewOutputs?.plain_text || activeVersion?.plain_text_output || ""}
            />
          )}
        </TabsContent>

        {/* Tab 2: Visual Tailored Diff Viewer */}
        <TabsContent value="diff" className="focus-visible:outline-none">
          {isVersionDetailsLoading ? (
            <div
              role="status"
              aria-label="Loading diff data"
              className="flex justify-center p-12 text-slate-500 dark:text-slate-400 text-sm"
            >
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400 mr-2" />
              Loading tailoring diff...
            </div>
          ) : (
            <DiffViewer
              currentVersion={activeVersion}
              masterProfile={masterProfile}
              previousVersions={versions}
            />
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
};
