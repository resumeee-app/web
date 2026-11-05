import * as React from "react";
import { Plus, Trash2, Edit2, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { isValidHttpUrl } from "@/lib/url";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  FORM_DIALOG_CONTENT_CLASS,
} from "@/components/ui/dialog";
import { ShortIdBadge } from "./short-id-badge";
import type { components } from "@/api/schema";

/**
 * Parses a comma-separated string of skill tokens into a trimmed, non-empty, deduplicated array.
 * Preserves the original token casing of the first occurrence while deduplicating case-insensitively.
 *
 * @param input - Raw comma-separated string of skills
 * @returns Deduplicated array of trimmed skill tokens
 */
export function parseSkillTokens(input: string): string[] {
  if (!input) {
    return [];
  }
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const raw of input.split(",")) {
    const trimmed = raw.trim();
    if (trimmed) {
      const lower = trimmed.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        tokens.push(trimmed);
      }
    }
  }
  return tokens;
}

/**
 * Props for the ProjectsList component.
 */
export interface ProjectsListProps {
  /** Array of projects from the canonical profile snapshot */
  projects: components["schemas"]["Project"][];
  /** Optional list of available skills from canonical profile for tag selection */
  availableSkills?: components["schemas"]["Skill"][];
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
 * - List of featured projects with role, date range, external URL, skills badges, summary, and ShortID badges.
 * - Nested list of quantifiable markdown highlights (Facts) with add and delete actions.
 * - Radix UI Dialog primitive for creating and editing project records,
 *   responsively sized to at least 720px on viewports >= 640px with vertical overflow handling.
 * - Collapsible "Extended Details" section for optional Start Date, End Date, and Skills tags.
 * - Screen-reader announcements for dynamic additions and removals conforming to WCAG 2.1 AA.
 *
 * @param props - ProjectsListProps
 * @returns Accessible projects manager element.
 */
export const ProjectsList: React.FC<ProjectsListProps> = ({
  projects,
  availableSkills,
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
  const [skillsInput, setSkillsInput] = React.useState("");
  const [extendedOpen, setExtendedOpen] = React.useState(false);

  // Per-project bullet input drafts
  const [bulletDrafts, setBulletDrafts] = React.useState<Record<string, string>>({});

  // Active project being edited (for preserving canonical skill IDs)
  const editingProject = React.useMemo(
    () => projects.find((p) => p.id === editingId),
    [projects, editingId]
  );

  // Memoized parsed skill tokens and fast lookup set for quick-add badges
  const activeSkillTokens = React.useMemo(
    () => parseSkillTokens(skillsInput),
    [skillsInput]
  );
  const activeSkillSet = React.useMemo(
    () => new Set(activeSkillTokens.map((t) => t.toLowerCase())),
    [activeSkillTokens]
  );

  const handleOpenAdd = () => {
    setEditingId(null);
    setName("");
    setRole("");
    setUrl("");
    setUrlError(null);
    setStartDate("");
    setEndDate("");
    setSummary("");
    setSkillsInput("");
    setExtendedOpen(false);
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
    setSkillsInput(
      proj.skills && proj.skills.length > 0
        ? proj.skills.map((s) => s.name || s.id).join(", ")
        : ""
    );
    setExtendedOpen(
      Boolean(
        proj.start_date ||
          proj.end_date ||
          (proj.skills && proj.skills.length > 0)
      )
    );
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

    const rawSkillTokens = parseSkillTokens(skillsInput);

    const skillLookupPool = [
      ...(availableSkills || []),
      ...(editingProject?.skills || []),
    ];

    const skillIds: string[] = [];
    const seen = new Set<string>();

    for (const token of rawSkillTokens) {
      const tokenLower = token.toLowerCase();
      const matched = skillLookupPool.find(
        (s) =>
          s.name.toLowerCase() === tokenLower ||
          s.id.toLowerCase() === tokenLower
      );
      const resolvedId = matched ? matched.id : token;
      if (!seen.has(resolvedId)) {
        seen.add(resolvedId);
        skillIds.push(resolvedId);
      }
    }

    const payload: components["schemas"]["CreateProjectRequest"] = {
      name: name.trim(),
      role: role.trim() || undefined,
      url: url.trim() || undefined,
      start_date: startDate.trim() || undefined,
      end_date: endDate.trim() || null,
      summary: summary.trim() || undefined,
      ...(editingId || skillIds.length > 0 ? { skill_ids: skillIds } : {}),
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
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Projects</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Open-source libraries, major initiatives, and featured technical projects.
          </p>
        </div>
        <Button onClick={handleOpenAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add Project</span>
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No projects added yet. Click &ldquo;Add Project&rdquo; to begin.
          </p>
        </div>
      ) : (
        <ul className="space-y-4" aria-label="Projects list">
          {projects.map((proj) => (
            <li
              key={proj.id}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {proj.name}
                    </h3>
                    {proj.role && (
                      <>
                        <span className="text-slate-500 dark:text-slate-400" aria-hidden="true">
                          •
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{proj.role}</span>
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
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <span>{proj.url}</span>
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                  {(proj.start_date || proj.end_date) && (
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {proj.start_date
                          ? `${proj.start_date} — ${proj.end_date || "Present"}`
                          : proj.end_date}
                      </span>
                    </div>
                  )}
                  {proj.skills && proj.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1" aria-label="Project skills">
                      {proj.skills.map((skill) => (
                        <span
                          key={skill.id}
                          className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300"
                        >
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {proj.summary && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{proj.summary}</p>
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
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/50"
                    aria-label={`Delete ${proj.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Bullets (Facts) */}
              <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Project Highlights
                </h4>
                <ul className="mt-2 space-y-2">
                  {proj.facts?.map((fact) => (
                    <li
                      key={fact.id}
                      className="flex items-start justify-between gap-3 rounded bg-slate-50 dark:bg-slate-800/60 px-3 py-2 text-sm text-slate-800 dark:text-slate-200"
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
                        className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
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
                    className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
        <DialogContent className={FORM_DIALOG_CONTENT_CLASS}>
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
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="proj-name"
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="proj-role"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Role
                </label>
                <input
                  id="proj-role"
                  type="text"
                  placeholder="e.g. Lead Maintainer / Author"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="proj-url"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
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
                      ? "border-red-300 dark:border-red-500/70 bg-white dark:bg-slate-900 text-red-900 dark:text-red-200 placeholder-red-300 dark:placeholder-red-400/60 focus-visible:ring-red-500"
                      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus-visible:ring-indigo-500"
                  )}
                />
                {urlError && (
                  <p id="proj-url-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {urlError}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="proj-summary"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Summary
                </label>
                <textarea
                  id="proj-summary"
                  rows={3}
                  placeholder="Brief description of the project..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              {/* Collapsible Extended Details */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setExtendedOpen((prev) => !prev)}
                  aria-expanded={extendedOpen}
                  aria-controls="project-extended-details"
                  className="flex w-full items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md py-1"
                >
                  <span>Extended Details</span>
                  {extendedOpen ? (
                    <ChevronUp className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                  )}
                </button>

                {extendedOpen && (
                  <div id="project-extended-details" className="mt-3 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="proj-start-date"
                          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Start Date
                        </label>
                        <input
                          id="proj-start-date"
                          type="text"
                          placeholder="YYYY-MM (e.g. 2023-01)"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="proj-end-date"
                          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          End Date
                        </label>
                        <input
                          id="proj-end-date"
                          type="text"
                          placeholder="YYYY-MM or blank if ongoing"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="proj-skills"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Skills
                      </label>
                      <input
                        id="proj-skills"
                        type="text"
                        placeholder="Comma-separated skill names or IDs (e.g. Go, Rust, React)"
                        value={skillsInput}
                        onChange={(e) => setSkillsInput(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      />
                      {availableSkills && availableSkills.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5 items-center" aria-label="Available skills to add">
                          <span className="text-xs text-slate-500 dark:text-slate-400">Quick add:</span>
                          {availableSkills.map((s) => {
                            const nameLower = s.name.toLowerCase();
                            const idLower = s.id.toLowerCase();
                            const isSelected =
                              activeSkillSet.has(nameLower) ||
                              activeSkillSet.has(idLower);

                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  let nextTokens: string[];
                                  if (isSelected) {
                                    nextTokens = activeSkillTokens.filter(
                                      (t) =>
                                        t.toLowerCase() !== nameLower &&
                                        t.toLowerCase() !== idLower
                                    );
                                  } else {
                                    nextTokens = [...activeSkillTokens, s.name];
                                  }
                                  setSkillsInput(nextTokens.join(", "));
                                }}
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                                  isSelected
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300"
                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700"
                                )}
                                aria-pressed={isSelected}
                              >
                                {isSelected ? "✓ " : "+ "}
                                {s.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
