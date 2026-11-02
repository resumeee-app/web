import * as React from "react";
import { Plus, Trash2, Edit2 } from "lucide-react";
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
 * Props for the EducationList component.
 */
export interface EducationListProps {
  /** Array of education records from canonical profile snapshot */
  education: components["schemas"]["Education"][];
  /** Callback to create a new education entry */
  onAddEducation: (data: components["schemas"]["CreateEducationRequest"]) => void;
  /** Callback to update an existing education entry */
  onUpdateEducation: (
    id: string,
    data: components["schemas"]["UpdateEducationRequest"]
  ) => void;
  /** Callback to remove an education entry by ID */
  onDeleteEducation: (id: string) => void;
  /** Optional accessible live-region announcement handler */
  onAnnouncement?: (message: string) => void;
  /** Optional container class name */
  className?: string;
}

/**
 * Accessible list view and modal management component for Education credentials.
 * Implements WAI-ARIA 1.2 dialog and labeling conventions with compact ShortID badges.
 */
export const EducationList: React.FC<EducationListProps> = ({
  education,
  onAddEducation,
  onUpdateEducation,
  onDeleteEducation,
  onAnnouncement,
  className,
}) => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Form fields
  const [institution, setInstitution] = React.useState("");
  const [degree, setDegree] = React.useState("");
  const [field, setField] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [score, setScore] = React.useState("");

  const handleOpenAdd = () => {
    setEditingId(null);
    setInstitution("");
    setDegree("");
    setField("");
    setStartDate("");
    setEndDate("");
    setScore("");
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: components["schemas"]["Education"]) => {
    setEditingId(item.id);
    setInstitution(item.institution);
    setDegree(item.degree || "");
    setField(item.field || "");
    setStartDate(item.start_date || "");
    setEndDate(item.end_date || "");
    setScore(item.score || "");
    setDialogOpen(true);
  };

  const handleSaveDialog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution.trim()) return;

    const payload: components["schemas"]["CreateEducationRequest"] = {
      institution: institution.trim(),
      degree: degree.trim() || undefined,
      field: field.trim() || undefined,
      start_date: startDate.trim() || undefined,
      end_date: endDate.trim() || null,
      score: score.trim() || undefined,
    };

    if (editingId) {
      onUpdateEducation(editingId, payload);
      onAnnouncement?.(`Updated education at ${institution}`);
    } else {
      onAddEducation(payload);
      onAnnouncement?.(`Added education at ${institution}`);
    }

    setDialogOpen(false);
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Education</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Degrees, academic institutions, fields of study, and honors.
          </p>
        </div>
        <Button onClick={handleOpenAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add Education</span>
        </Button>
      </div>

      {education.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No education history added yet. Click &ldquo;Add Education&rdquo; to begin.
          </p>
        </div>
      ) : (
        <ul className="space-y-4" aria-label="Education history list">
          {education.map((edu) => {
            const dateDisplay = [edu.start_date, edu.end_date || "Present"]
              .filter(Boolean)
              .join(" — ");

            return (
              <li
                key={edu.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {edu.institution}
                    </h3>
                    <ShortIdBadge
                      id={edu.id}
                      shortId={(edu as { short_id?: string }).short_id}
                    />
                  </div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {[edu.degree, edu.field].filter(Boolean).join(" in ")}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    {dateDisplay && <span>{dateDisplay}</span>}
                    {edu.score && (
                      <>
                        <span aria-hidden="true">•</span>
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {edu.score}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(edu)}
                    aria-label={`Edit education at ${edu.institution}`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onDeleteEducation(edu.id);
                      onAnnouncement?.(`Deleted education at ${edu.institution}`);
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/50"
                    aria-label={`Delete education at ${edu.institution}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add / Edit Education Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveDialog}>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Education" : "Add Education"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label
                  htmlFor="edu-institution"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Institution / University <span className="text-red-500">*</span>
                </label>
                <input
                  id="edu-institution"
                  required
                  type="text"
                  placeholder="e.g. Stanford University"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="edu-degree"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Degree
                </label>
                <input
                  id="edu-degree"
                  type="text"
                  placeholder="e.g. Bachelor of Science"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="edu-field"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Field of Study
                </label>
                <input
                  id="edu-field"
                  type="text"
                  placeholder="e.g. Computer Science"
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="edu-start"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Start Date
                  </label>
                  <input
                    id="edu-start"
                    type="text"
                    placeholder="YYYY-MM"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edu-end"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Graduation Date
                  </label>
                  <input
                    id="edu-end"
                    type="text"
                    placeholder="YYYY-MM"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="edu-score"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Honors / GPA / Awards
                </label>
                <input
                  id="edu-score"
                  type="text"
                  placeholder="e.g. Summa Cum Laude, GPA 3.9"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
              <Button type="submit">Save Education</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
