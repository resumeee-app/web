import * as React from "react";
import { Plus, Trash2, Edit2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidHttpUrl } from "@/lib/url";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ShortIdBadge } from "./short-id-badge";
import type { components } from "@/api/schema";

/**
 * Props for the ProjectsList component.
 */
export interface ProjectsListProps {
  /** Array of projects from the canonical profile snapshot */
  projects: components["schemas"]["Project"][];
  /** Callback to create a new project record */
  onAddProject: (data: components["schemas"]["CreateProjectRequest"]) => void;
  /** Callback to update an existing project record */
  onUpdateProject: (
    id: string,
    data: components["schemas"]["UpdateProjectRequest"]
  ) => void;
  /** Callback to delete a project record by ID */
  onDeleteProject: (id: string) => void;
  /** Callback to create a polymorphic fact (highlight) under a project */
  onAddFact: (ownerId: string, statement: string) => void;
  /** Callback to delete a fact by ID */
  onDeleteFact: (factId: string) => void;
  /** Optional accessible live-region announcement handler */
  onAnnouncement?: (message: string) => void;
  /** Optional container class name */
  className?: string;
}

/**
 * Accessible list view and modal management component for Technical Projects.
 *
 * Implements:
 * - List of featured projects with role, external URL, summary, and ShortID badges.
 * - Nested list of quantifiable markdown highlights (Facts) with add and delete actions.
 * - Radix UI Dialog primitive for creating and editing project records.
 * - Screen-reader announcements for dynamic additions and removals conforming to WCAG 2.1 AA.
 *
 * @param props - ProjectsListProps
 * @returns Accessible projects manager element.
 */
export const ProjectsList: React.FC<ProjectsListProps> = ({
  projects,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onAddFact,
  onDeleteFact,
  onAnnouncement,
  className,
}) => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Form state
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [urlError, setUrlError] = React.useState<string | null>(null);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [summary, setSummary] = React.useState("");

  // Per-project bullet input drafts
  const [bulletDrafts, setBulletDrafts] = React.useState<Record<string, string>>({});

  const handleOpenAdd = () => {
    setEditingId(null);
    setName("");
    setRole("");
    setUrl("");
    setUrlError(null);
    setStartDate("");
    setEndDate("");
    setSummary("");
    setDialogOpen(true);
  };

  const handleOpenEdit = (proj: components["schemas"]["Project"]) => {
    setEditingId(proj.id);
    setName(proj.name);
    setRole(proj.role || "");
    setUrl(proj.url || "");
    setUrlError(null);
    setStartDate(proj.start_date || "");
    setEndDate(proj.end_date || "");
    setSummary(proj.summary || "");
    setDialogOpen(true);
  };

  const handleSaveDialog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (url.trim() && !isValidHttpUrl(url.trim())) {
      setUrlError("Please enter a valid HTTP or HTTPS URL.");
      return;
    }
    setUrlError(null);

    const payload: components["schemas"]["CreateProjectRequest"] = {
      name: name.trim(),
      role: role.trim() || undefined,
      url: url.trim() || undefined,
      start_date: startDate.trim() || undefined,
      end_date: endDate.trim() || null,
      summary: summary.trim() || undefined,
    };

    if (editingId) {
      onUpdateProject(editingId, payload);
      onAnnouncement?.(`Updated project ${name}`);
    } else {
      onAddProject(payload);
      onAnnouncement?.(`Added project ${name}`);
    }

    setDialogOpen(false);
  };

  const handleAddBulletSubmit = (projId: string, projName: string) => {
    const draft = (bulletDrafts[projId] || "").trim();
    if (!draft) return;

    onAddFact(projId, draft);
    setBulletDrafts((prev) => ({ ...prev, [projId]: "" }));
    onAnnouncement?.(`Bullet point added to ${projName}`);
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
          <p className="text-sm text-slate-500">
            Open-source libraries, major initiatives, and featured technical projects.
          </p>
        </div>
        <Button onClick={handleOpenAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add Project</span>
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm text-slate-500">
            No projects added yet. Click &ldquo;Add Project&rdquo; to begin.
          </p>
        </div>
      ) : (
        <ul className="space-y-4" aria-label="Projects list">
          {projects.map((proj) => (
            <li
              key={proj.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-slate-900">
                      {proj.name}
                    </h3>
                    {proj.role && (
                      <>
                        <span className="text-slate-500" aria-hidden="true">
                          •
                        </span>
                        <span className="font-medium text-slate-700">{proj.role}</span>
                      </>
                    )}
                    <ShortIdBadge
                      id={proj.id}
                      shortId={(proj as { short_id?: string }).short_id}
                    />
                  </div>
                  {proj.url && isValidHttpUrl(proj.url) && (
                    <a
                      href={proj.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                    >
                      <span>{proj.url}</span>
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                  {proj.summary && (
                    <p className="text-sm text-slate-600 mt-1">{proj.summary}</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(proj)}
                    aria-label={`Edit ${proj.name}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onDeleteProject(proj.id);
                      onAnnouncement?.(`Deleted project ${proj.name}`);
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    aria-label={`Delete ${proj.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Bullets (Facts) */}
              <div className="mt-4 border-t border-slate-100 pt-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Project Highlights
                </h4>
                <ul className="mt-2 space-y-2">
                  {proj.facts?.map((fact) => (
                    <li
                      key={fact.id}
                      className="flex items-start justify-between gap-3 rounded bg-slate-50 px-3 py-2 text-sm text-slate-800"
                    >
                      <div className="flex items-start gap-2">
                        <ShortIdBadge
                          id={fact.id}
                          shortId={(fact as { short_id?: string }).short_id}
                          className="mt-0.5 shrink-0"
                        />
                        <span>{fact.statement}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onDeleteFact(fact.id);
                          onAnnouncement?.("Deleted project bullet point");
                        }}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-red-600"
                        aria-label={`Delete bullet point ${fact.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>

                {/* Add Bullet Form */}
                <div className="mt-3 flex items-center gap-2">
                  <label htmlFor={`proj-bullet-${proj.id}`} className="sr-only">
                    New highlight for {proj.name}
                  </label>
                  <input
                    id={`proj-bullet-${proj.id}`}
                    type="text"
                    value={bulletDrafts[proj.id] || ""}
                    onChange={(e) =>
                      setBulletDrafts((prev) => ({
                        ...prev,
                        [proj.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddBulletSubmit(proj.id, proj.name);
                      }
                    }}
                    placeholder="Add project highlight (markdown supported)..."
                    className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleAddBulletSubmit(proj.id, proj.name)}
                    aria-label={`Add highlight to ${proj.name}`}
                  >
                    Add Highlight
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add / Edit Project Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveDialog}>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Project" : "Add Project"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label
                  htmlFor="proj-name"
                  className="block text-sm font-medium text-slate-700"
                >
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="proj-name"
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="proj-role"
                  className="block text-sm font-medium text-slate-700"
                >
                  Role
                </label>
                <input
                  id="proj-role"
                  type="text"
                  placeholder="e.g. Lead Maintainer / Author"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="proj-url"
                  className="block text-sm font-medium text-slate-700"
                >
                  Project URL
                </label>
                <input
                  id="proj-url"
                  type="url"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (urlError) setUrlError(null);
                  }}
                  aria-invalid={urlError ? "true" : "false"}
                  aria-describedby={urlError ? "proj-url-error" : undefined}
                  className={cn(
                    "mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2",
                    urlError
                      ? "border-red-300 text-red-900 placeholder-red-300 focus-visible:ring-red-500"
                      : "border-slate-300 placeholder-slate-400 focus-visible:ring-indigo-500"
                  )}
                />
                {urlError && (
                  <p id="proj-url-error" className="mt-1 text-xs text-red-600">
                    {urlError}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="proj-summary"
                  className="block text-sm font-medium text-slate-700"
                >
                  Summary
                </label>
                <textarea
                  id="proj-summary"
                  rows={3}
                  placeholder="Brief description of the project..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Project</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
