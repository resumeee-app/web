import * as React from "react";
import { Plus, ArrowUp, ArrowDown, Trash2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
 * Props for the ExperienceList component.
 */
export interface ExperienceListProps {
  /** Array of work experiences from the canonical profile snapshot */
  experiences: components["schemas"]["WorkExperience"][];
  /** Callback invoked when the user changes the chronological order of experiences */
  onReorder: (experiences: components["schemas"]["WorkExperience"][]) => void;
  /** Callback to create a new work experience record */
  onAddExperience: (data: components["schemas"]["CreateExperienceRequest"]) => void;
  /** Callback to update an existing work experience record */
  onUpdateExperience: (
    id: string,
    data: components["schemas"]["UpdateExperienceRequest"]
  ) => void;
  /** Callback to delete a work experience record by ID */
  onDeleteExperience: (id: string) => void;
  /** Callback to create a polymorphic bullet point fact under a work experience */
  onAddFact: (ownerId: string, statement: string) => void;
  /** Callback to delete a bullet point fact by ID */
  onDeleteFact: (factId: string) => void;
  /** Optional accessible live-region announcement handler */
  onAnnouncement?: (message: string) => void;
  /** Optional container class name */
  className?: string;
}

/**
 * Accessible list view and modal management component for Work Experience entries.
 *
 * Implements:
 * - Orderable list with keyboard-accessible Move Up and Move Down controls.
 * - Display of compact ShortIDs (Issue #84) for experiences and bullet points.
 * - Nested list of quantifiable markdown bullet points (Facts) with add and delete actions.
 * - Radix UI Dialog primitive for creating and editing work experience records.
 * - Screen-reader announcements for dynamic additions, removals, and reordering.
 *
 * @param props - ExperienceListProps
 * @returns Accessible experience manager element.
 */
export const ExperienceList: React.FC<ExperienceListProps> = ({
  experiences,
  onReorder,
  onAddExperience,
  onUpdateExperience,
  onDeleteExperience,
  onAddFact,
  onDeleteFact,
  onAnnouncement,
  className,
}) => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Form state for add/edit dialog
  const [company, setCompany] = React.useState("");
  const [roleTitle, setRoleTitle] = React.useState("");
  const [city, setCity] = React.useState("");
  const [region, setRegion] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [isCurrent, setIsCurrent] = React.useState(false);

  // Per-experience bullet input drafts
  const [bulletDrafts, setBulletDrafts] = React.useState<Record<string, string>>({});

  const handleOpenAdd = () => {
    setEditingId(null);
    setCompany("");
    setRoleTitle("");
    setCity("");
    setRegion("");
    setStartDate("");
    setEndDate("");
    setIsCurrent(false);
    setDialogOpen(true);
  };

  const handleOpenEdit = (exp: components["schemas"]["WorkExperience"]) => {
    setEditingId(exp.id);
    setCompany(exp.company);
    setRoleTitle(exp.role_title);
    setCity(exp.location?.city || "");
    setRegion(exp.location?.region || "");
    setStartDate(exp.start_date);
    setEndDate(exp.end_date || "");
    setIsCurrent(Boolean(exp.is_current));
    setDialogOpen(true);
  };

  const handleSaveDialog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !roleTitle.trim() || !startDate.trim()) {
      return;
    }

    const payload: components["schemas"]["CreateExperienceRequest"] = {
      company: company.trim(),
      role_title: roleTitle.trim(),
      start_date: startDate.trim(),
      end_date: isCurrent ? null : endDate.trim() || null,
      is_current: isCurrent,
      location: {
        city: city.trim() || undefined,
        region: region.trim() || undefined,
      },
    };

    if (editingId) {
      onUpdateExperience(editingId, payload);
      onAnnouncement?.(`Updated experience for ${company}`);
    } else {
      onAddExperience(payload);
      onAnnouncement?.(`Added experience for ${company}`);
    }

    setDialogOpen(false);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= experiences.length) return;

    const reordered = [...experiences];
    const [moved] = reordered.splice(index, 1);
    if (!moved) return;
    reordered.splice(targetIndex, 0, moved);
    onReorder(reordered);
    onAnnouncement?.(
      `Moved ${moved.role_title} at ${moved.company} ${direction}`
    );
  };

  const handleAddBulletSubmit = (expId: string, expCompany: string) => {
    const draft = (bulletDrafts[expId] || "").trim();
    if (!draft) return;

    onAddFact(expId, draft);
    setBulletDrafts((prev) => ({ ...prev, [expId]: "" }));
    onAnnouncement?.(`Bullet point added to ${expCompany}`);
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Work Experience</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Chronological employment history with quantifiable markdown bullet points.
          </p>
        </div>
        <Button onClick={handleOpenAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add Work Experience</span>
        </Button>
      </div>

      {experiences.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No work experiences added yet. Click &ldquo;Add Work Experience&rdquo; to begin.
          </p>
        </div>
      ) : (
        <ul className="space-y-4" aria-label="Work experiences list">
          {experiences.map((exp, idx) => {
            const dateDisplay = exp.is_current
              ? `${exp.start_date} — Present`
              : `${exp.start_date} — ${exp.end_date || "Present"}`;
            const locationDisplay = [exp.location?.city, exp.location?.region]
              .filter(Boolean)
              .join(", ");

            return (
              <li
                key={exp.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        {exp.role_title}
                      </h3>
                      <span className="text-slate-500 dark:text-slate-400" aria-hidden="true">
                        at
                      </span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{exp.company}</span>
                      <ShortIdBadge id={exp.id} shortId={(exp as { short_id?: string }).short_id} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>{dateDisplay}</span>
                      {locationDisplay && (
                        <>
                          <span aria-hidden="true">•</span>
                          <span>{locationDisplay}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions: Reorder, Edit, Delete */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMove(idx, "up")}
                      disabled={idx === 0}
                      aria-label={`Move ${exp.role_title} at ${exp.company} up`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMove(idx, "down")}
                      disabled={idx === experiences.length - 1}
                      aria-label={`Move ${exp.role_title} at ${exp.company} down`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(exp)}
                      aria-label={`Edit ${exp.role_title} at ${exp.company}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onDeleteExperience(exp.id);
                        onAnnouncement?.(`Deleted experience for ${exp.company}`);
                      }}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/50"
                      aria-label={`Delete ${exp.role_title} at ${exp.company}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Bullets (Facts) */}
                <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Key Achievements & Bullet Points
                  </h4>
                  <ul className="mt-2 space-y-2">
                    {exp.facts?.map((fact) => (
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
                            onAnnouncement?.(`Deleted bullet point`);
                          }}
                          className="h-6 w-6 p-0 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                          aria-label={`Delete bullet point ${fact.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>

                  {/* Add Bullet Form */}
                  <div className="mt-3 flex items-center gap-2">
                    <label
                      htmlFor={`bullet-input-${exp.id}`}
                      className="sr-only"
                    >
                      New bullet point for {exp.company}
                    </label>
                    <input
                      id={`bullet-input-${exp.id}`}
                      type="text"
                      value={bulletDrafts[exp.id] || ""}
                      onChange={(e) =>
                        setBulletDrafts((prev) => ({
                          ...prev,
                          [exp.id]: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddBulletSubmit(exp.id, exp.company);
                        }
                      }}
                      placeholder="Add quantifiable bullet point (markdown supported)..."
                      className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => handleAddBulletSubmit(exp.id, exp.company)}
                      aria-label={`Add bullet to ${exp.company}`}
                    >
                      Add Bullet
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add / Edit Experience Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveDialog}>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Work Experience" : "Add Work Experience"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label
                  htmlFor="exp-role"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Role / Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="exp-role"
                  required
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="exp-company"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Company / Organization <span className="text-red-500">*</span>
                </label>
                <input
                  id="exp-company"
                  required
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="exp-city"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    City
                  </label>
                  <input
                    id="exp-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="exp-region"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    State / Region
                  </label>
                  <input
                    id="exp-region"
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="exp-start"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="exp-start"
                    required
                    type="text"
                    placeholder="YYYY-MM"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="exp-end"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    End Date
                  </label>
                  <input
                    id="exp-end"
                    type="text"
                    placeholder="YYYY-MM"
                    disabled={isCurrent}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="exp-current"
                  type="checkbox"
                  checked={isCurrent}
                  onChange={(e) => setIsCurrent(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-indigo-600 focus-visible:ring-indigo-500"
                />
                <label
                  htmlFor="exp-current"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  I currently work here (Present)
                </label>
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
              <Button type="submit">Save Experience</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
