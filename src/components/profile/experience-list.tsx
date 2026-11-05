import * as React from "react";
import { Plus, ArrowUp, ArrowDown, Trash2, Edit2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
 * Helper to split a comma-separated skill string into a normalized array of non-empty tokens.
 *
 * @param input - Raw comma-separated skill tokens.
 * @returns Array of trimmed skill IDs.
 */
export function parseSkillTokens(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Props for the ExperienceList component.
 */
export interface ExperienceListProps {
  /** Array of work experiences from the canonical profile snapshot */
  experiences: components["schemas"]["WorkExperience"][];
  /** Optional array of all available master skills for selection */
  availableSkills?: components["schemas"]["Skill"][];
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
 * - Collapsible "Extended Details" section for administrative, government, and visa fields:
 *   employment type, company location, company contact, hours per week, supervisor details,
 *   duties summary, and linked skills.
 * - Radix UI Dialog primitive for creating and editing work experience records,
 *   responsively sized to at least 720px on viewports >= 640px with vertical overflow handling.
 * - Screen-reader announcements for dynamic additions, removals, and reordering.
 *
 * @param props - ExperienceListProps
 * @returns Accessible experience manager element.
 */
export const ExperienceList: React.FC<ExperienceListProps> = ({
  experiences,
  availableSkills,
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
  const [editingExperience, setEditingExperience] =
    React.useState<components["schemas"]["WorkExperience"] | null>(null);

  const skillLookupPool = React.useMemo(() => {
    const pool = [...(availableSkills || [])];
    if (editingExperience?.skills) {
      for (const s of editingExperience.skills) {
        if (!pool.some((p) => p.id === s.id)) {
          pool.push(s);
        }
      }
    }
    return pool;
  }, [availableSkills, editingExperience]);

  // Form state for add/edit dialog
  const [company, setCompany] = React.useState("");
  const [roleTitle, setRoleTitle] = React.useState("");
  const [city, setCity] = React.useState("");
  const [region, setRegion] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [isCurrent, setIsCurrent] = React.useState(false);

  // Extended details form state
  const [showExtended, setShowExtended] = React.useState(false);
  const [employmentType, setEmploymentType] = React.useState<string>("");
  const [companyCity, setCompanyCity] = React.useState("");
  const [companyRegion, setCompanyRegion] = React.useState("");
  const [companyContactType, setCompanyContactType] =
    React.useState<components["schemas"]["ContactType"]>("Email");
  const [companyContactValue, setCompanyContactValue] = React.useState("");
  const [hoursPerWeek, setHoursPerWeek] = React.useState<string>("");
  const [supervisorName, setSupervisorName] = React.useState("");
  const [supervisorContact, setSupervisorContact] = React.useState("");
  const [dutiesSummary, setDutiesSummary] = React.useState("");
  const [skillsInput, setSkillsInput] = React.useState("");

  // Per-experience bullet input drafts
  const [bulletDrafts, setBulletDrafts] = React.useState<Record<string, string>>({});

  const handleOpenAdd = () => {
    setEditingId(null);
    setEditingExperience(null);
    setCompany("");
    setRoleTitle("");
    setCity("");
    setRegion("");
    setStartDate("");
    setEndDate("");
    setIsCurrent(false);
    setEmploymentType("");
    setCompanyCity("");
    setCompanyRegion("");
    setCompanyContactType("Email");
    setCompanyContactValue("");
    setHoursPerWeek("");
    setSupervisorName("");
    setSupervisorContact("");
    setDutiesSummary("");
    setSkillsInput("");
    setShowExtended(false);
    setDialogOpen(true);
  };

  const handleOpenEdit = (exp: components["schemas"]["WorkExperience"]) => {
    setEditingId(exp.id);
    setEditingExperience(exp);
    setCompany(exp.company);
    setRoleTitle(exp.role_title);
    setCity(exp.location?.city || "");
    setRegion(exp.location?.region || "");
    setStartDate(exp.start_date);
    setEndDate(exp.end_date || "");
    setIsCurrent(Boolean(exp.is_current));
    setEmploymentType(exp.employment_type || "");
    setCompanyCity(exp.company_location?.city || "");
    setCompanyRegion(exp.company_location?.region || "");
    setCompanyContactType(exp.company_contact?.type || "Email");
    setCompanyContactValue(exp.company_contact?.value || "");
    setHoursPerWeek(
      exp.hours_per_week !== null && exp.hours_per_week !== undefined
        ? String(exp.hours_per_week)
        : ""
    );
    setSupervisorName(exp.supervisor_name || "");
    setSupervisorContact(exp.supervisor_contact || "");
    setDutiesSummary(exp.duties_summary || "");
    setSkillsInput(exp.skills?.map((s) => s.name || s.id).join(", ") || "");
    setShowExtended(false);
    setDialogOpen(true);
  };

  const handleSaveDialog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !roleTitle.trim() || !startDate.trim()) {
      return;
    }

    const trimmedCompanyCity = companyCity.trim();
    const trimmedCompanyRegion = companyRegion.trim();
    const hasCompanyLocation = Boolean(trimmedCompanyCity || trimmedCompanyRegion);
    const companyLocation = editingId
      ? {
          city: trimmedCompanyCity || undefined,
          region: trimmedCompanyRegion || undefined,
        }
      : hasCompanyLocation
      ? {
          city: trimmedCompanyCity || undefined,
          region: trimmedCompanyRegion || undefined,
        }
      : undefined;

    const trimmedCompanyContact = companyContactValue.trim();
    const companyContact = editingId
      ? {
          type: companyContactType,
          value: trimmedCompanyContact,
        }
      : trimmedCompanyContact
      ? {
          type: companyContactType,
          value: trimmedCompanyContact,
        }
      : undefined;

    const parsed = parseInt(hoursPerWeek.trim(), 10);
    const parsedHours =
      !Number.isNaN(parsed) && Number.isFinite(parsed) && parsed >= 1 && parsed <= 168
        ? parsed
        : undefined;

    const rawSkillTokens = parseSkillTokens(skillsInput);
    const skillIds: string[] = [];
    const seenSkillIds = new Set<string>();

    for (const token of rawSkillTokens) {
      const tokenLower = token.toLowerCase();
      const matched = skillLookupPool.find(
        (s) =>
          s.name.toLowerCase() === tokenLower ||
          s.id.toLowerCase() === tokenLower
      );
      const resolvedId = matched ? matched.id : token;
      if (!seenSkillIds.has(resolvedId)) {
        seenSkillIds.add(resolvedId);
        skillIds.push(resolvedId);
      }
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
      employment_type: employmentType
        ? (employmentType as components["schemas"]["EmploymentType"])
        : editingId
        ? ("" as components["schemas"]["EmploymentType"])
        : undefined,
      company_location: companyLocation,
      company_contact: companyContact,
      hours_per_week: editingId ? (parsedHours !== undefined ? parsedHours : 0) : parsedHours,
      supervisor_name: supervisorName.trim() || (editingId ? "" : undefined),
      supervisor_contact: supervisorContact.trim() || (editingId ? "" : undefined),
      duties_summary: dutiesSummary.trim() || (editingId ? "" : undefined),
      skill_ids: editingId ? skillIds : skillIds.length > 0 ? skillIds : undefined,
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
                      {exp.employment_type && (
                        <span className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                          {exp.employment_type}
                        </span>
                      )}
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
                    {exp.duties_summary && (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        {exp.duties_summary}
                      </p>
                    )}
                    {exp.skills && exp.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {exp.skills.map((skill) => (
                          <span
                            key={skill.id}
                            className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300"
                          >
                            {skill.name || skill.id}
                          </span>
                        ))}
                      </div>
                    )}
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
        <DialogContent className={FORM_DIALOG_CONTENT_CLASS}>
          <form noValidate onSubmit={handleSaveDialog}>
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

              {/* Collapsible Extended Details */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowExtended((prev) => !prev)}
                  className="flex w-full items-center justify-between py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  aria-expanded={showExtended}
                  aria-controls="extended-details-section"
                >
                  <span>Extended Details (Optional)</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      showExtended && "rotate-180"
                    )}
                    aria-hidden="true"
                  />
                </button>

                {showExtended && (
                  <div id="extended-details-section" className="mt-3 space-y-4">
                    {/* 1. Employment Type */}
                    <div>
                      <label
                        htmlFor="exp-employment-type"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Employment Type
                      </label>
                      <select
                        id="exp-employment-type"
                        value={employmentType}
                        onChange={(e) => setEmploymentType(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      >
                        <option value="">Select Employment Type</option>
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Contract">Contract</option>
                        <option value="Internship">Internship</option>
                      </select>
                    </div>

                    {/* 2. Company Location */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="exp-company-city"
                          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Company City
                        </label>
                        <input
                          id="exp-company-city"
                          type="text"
                          placeholder="City"
                          value={companyCity}
                          onChange={(e) => setCompanyCity(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="exp-company-region"
                          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Company State / Region
                        </label>
                        <input
                          id="exp-company-region"
                          type="text"
                          placeholder="State or Region"
                          value={companyRegion}
                          onChange={(e) => setCompanyRegion(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* 3. Company Contact */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label
                          htmlFor="exp-company-contact-type"
                          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Company Contact Type
                        </label>
                        <select
                          id="exp-company-contact-type"
                          value={companyContactType}
                          onChange={(e) =>
                            setCompanyContactType(
                              e.target.value as components["schemas"]["ContactType"]
                            )
                          }
                          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <option value="Email">Email</option>
                          <option value="Phone">Phone</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label
                          htmlFor="exp-company-contact-value"
                          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          Company Contact Value
                        </label>
                        <input
                          id="exp-company-contact-value"
                          type="text"
                          placeholder="hr@example.com or phone"
                          value={companyContactValue}
                          onChange={(e) => setCompanyContactValue(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* 4. Hours Per Week */}
                    <div>
                      <label
                        htmlFor="exp-hours-per-week"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Hours Per Week
                      </label>
                      <input
                        id="exp-hours-per-week"
                        type="number"
                        min="1"
                        max="168"
                        placeholder="e.g. 40"
                        value={hoursPerWeek}
                        onChange={(e) => setHoursPerWeek(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      />
                    </div>

                    {/* 5. Supervisor Name */}
                    <div>
                      <label
                        htmlFor="exp-supervisor-name"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Supervisor Name
                      </label>
                      <input
                        id="exp-supervisor-name"
                        type="text"
                        placeholder="e.g. Jane Doe"
                        value={supervisorName}
                        onChange={(e) => setSupervisorName(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      />
                    </div>

                    {/* 6. Supervisor Contact */}
                    <div>
                      <label
                        htmlFor="exp-supervisor-contact"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Supervisor Contact
                      </label>
                      <input
                        id="exp-supervisor-contact"
                        type="text"
                        placeholder="e.g. jane.doe@company.com"
                        value={supervisorContact}
                        onChange={(e) => setSupervisorContact(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      />
                    </div>

                    {/* 7. Duties Summary */}
                    <div>
                      <label
                        htmlFor="exp-duties-summary"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Duties Summary
                      </label>
                      <textarea
                        id="exp-duties-summary"
                        rows={3}
                        placeholder="Summary of official duties and scope of responsibility..."
                        value={dutiesSummary}
                        onChange={(e) => setDutiesSummary(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      />
                    </div>

                    {/* 8. Skills */}
                    <div>
                      <label
                        htmlFor="exp-skills"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Skills (comma-separated)
                      </label>
                      <input
                        id="exp-skills"
                        type="text"
                        placeholder="e.g. Go, Docker, Kubernetes"
                        value={skillsInput}
                        onChange={(e) => setSkillsInput(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      />
                      {skillLookupPool && skillLookupPool.length > 0 && (() => {
                        const currentSkillTokens = parseSkillTokens(skillsInput);
                        const isSkillSelected = (s: components["schemas"]["Skill"]) => {
                          const nameLower = (s.name || "").toLowerCase();
                          const idLower = (s.id || "").toLowerCase();
                          return currentSkillTokens.some(
                            (tok) =>
                              (nameLower !== "" && tok.toLowerCase() === nameLower) ||
                              (idLower !== "" && tok.toLowerCase() === idLower)
                          );
                        };

                        return (
                          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Available skill tags">
                            {skillLookupPool.map((s) => {
                              const isSelected = isSkillSelected(s);
                              const displayName = s.name || s.id;
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => {
                                    const nameLower = (s.name || "").toLowerCase();
                                    const idLower = (s.id || "").toLowerCase();
                                    const next = isSelected
                                      ? currentSkillTokens.filter(
                                          (tok) =>
                                            (nameLower === "" || tok.toLowerCase() !== nameLower) &&
                                            (idLower === "" || tok.toLowerCase() !== idLower)
                                        )
                                      : [...currentSkillTokens, displayName];
                                    setSkillsInput(next.join(", "));
                                  }}
                                  className={cn(
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border transition-colors",
                                    isSelected
                                      ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                                      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600"
                                  )}
                                  aria-pressed={isSelected}
                                >
                                  {displayName}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
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
              <Button type="submit">Save Experience</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

