import * as React from "react";
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp } from "lucide-react";
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
import { formatDateRange, formatDateInput } from "@/lib/date";
import type { components } from "@/api/schema";

/**
 * Props for the EducationList component.
 */
export interface EducationListProps {
  /** Array of education records from canonical profile snapshot */
  education: components["schemas"]["Education"][];
  /** Callback to create a new education entry, optionally with draft bullet facts */
  onAddEducation: (
    data: components["schemas"]["CreateEducationRequest"],
    facts?: string[]
  ) => void;
  /** Callback to update an existing education entry */
  onUpdateEducation: (
    id: string,
    data: components["schemas"]["UpdateEducationRequest"]
  ) => void;
  /** Callback to remove an education entry by ID */
  onDeleteEducation: (id: string) => void;
  /** Callback to create a polymorphic bullet point fact under an education entry */
  onAddFact?: (ownerId: string, statement: string) => void;
  /** Callback to delete a bullet point fact by ID */
  onDeleteFact?: (factId: string) => void;
  /** Optional accessible live-region announcement handler */
  onAnnouncement?: (message: string) => void;
  /** Optional container class name */
  className?: string;
}

/**
 * Accessible list view and modal management component for Education credentials.
 * Implements WAI-ARIA 1.2 dialog and labeling conventions with compact ShortID badges,
 * collapsible "Extended Details" for optional Location and Facts, and inline bullet management.
 * Features an accessible dialog responsively sized to at least 720px on viewports >= 640px.
 *
 * @param props - EducationListProps
 * @returns Accessible education manager element.
 */
export const EducationList: React.FC<EducationListProps> = ({
  education,
  onAddEducation,
  onUpdateEducation,
  onDeleteEducation,
  onAddFact,
  onDeleteFact,
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

  // Extended Details collapsible state
  const [showExtendedDetails, setShowExtendedDetails] = React.useState(false);
  const [city, setCity] = React.useState("");
  const [region, setRegion] = React.useState("");

  // Modal bullet point drafts
  const [modalFactDraft, setModalFactDraft] = React.useState("");
  const [draftFacts, setDraftFacts] = React.useState<string[]>([]);
  const [institutionError, setInstitutionError] = React.useState<string | null>(null);

  const triggerRef = React.useRef<HTMLElement | null>(null);
  const institutionInputRef = React.useRef<HTMLInputElement | null>(null);

  // Per-education card bullet draft in list view
  const [cardBulletDrafts, setCardBulletDrafts] = React.useState<Record<string, string>>({});

  // Reference to current education entry being edited
  const currentEdu = React.useMemo(
    () => (editingId ? education.find((e) => e.id === editingId) : null),
    [education, editingId]
  );

  React.useEffect(() => {
    if (dialogOpen && !triggerRef.current) {
      triggerRef.current = (document.activeElement as HTMLElement) || null;
    }
  }, [dialogOpen]);

  const handleOpenAdd = (e?: React.MouseEvent<HTMLElement>) => {
    triggerRef.current = (e?.currentTarget || document.activeElement) as HTMLElement;
    setEditingId(null);
    setInstitution("");
    setDegree("");
    setField("");
    setStartDate("");
    setEndDate("");
    setScore("");
    setCity("");
    setRegion("");
    setShowExtendedDetails(false);
    setModalFactDraft("");
    setDraftFacts([]);
    setInstitutionError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (
    item: components["schemas"]["Education"],
    e?: React.MouseEvent<HTMLElement>
  ) => {
    triggerRef.current = (e?.currentTarget || document.activeElement) as HTMLElement;
    setEditingId(item.id);
    setInstitution(item.institution);
    setDegree(item.degree || "");
    setField(item.field || "");
    setStartDate(formatDateInput(item.start_date));
    setEndDate(formatDateInput(item.end_date));
    setScore(item.score || "");
    setCity(item.location?.city || "");
    setRegion(item.location?.region || "");

    const hasExtendedData = Boolean(
      item.location?.city ||
        item.location?.region ||
        (item.facts && item.facts.length > 0)
    );
    setShowExtendedDetails(hasExtendedData);
    setModalFactDraft("");
    setDraftFacts([]);
    setInstitutionError(null);
    setDialogOpen(true);
  };

  const handleSaveDialog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution.trim()) {
      setInstitutionError("Institution / School is required.");
      institutionInputRef.current?.focus();
      return;
    }
    setInstitutionError(null);

    const locCity = city.trim();
    const locRegion = region.trim();
    const hasLocation = Boolean(locCity || locRegion);

    if (editingId) {
      const updatePayload: components["schemas"]["UpdateEducationRequest"] = {
        institution: institution.trim(),
        degree: degree.trim() || undefined,
        field: field.trim() || undefined,
        start_date: startDate.trim() || undefined,
        end_date: endDate.trim() || null,
        score: score.trim() || undefined,
        location: hasLocation
          ? {
              city: locCity || undefined,
              region: locRegion || undefined,
            }
          : {},
      };
      onUpdateEducation(editingId, updatePayload);
      onAnnouncement?.(`Updated education at ${institution}`);
    } else {
      const createPayload: components["schemas"]["CreateEducationRequest"] = {
        institution: institution.trim(),
        degree: degree.trim() || undefined,
        field: field.trim() || undefined,
        start_date: startDate.trim() || undefined,
        end_date: endDate.trim() || null,
        score: score.trim() || undefined,
        location: hasLocation
          ? {
              city: locCity || undefined,
              region: locRegion || undefined,
            }
          : undefined,
      };
      if (draftFacts.length > 0) {
        onAddEducation(createPayload, draftFacts);
      } else {
        onAddEducation(createPayload);
      }
      onAnnouncement?.(`Added education at ${institution}`);
    }

    setDialogOpen(false);
  };

  const handleModalAddBullet = () => {
    const draft = modalFactDraft.trim();
    if (!draft) return;

    if (editingId) {
      if (onAddFact) {
        onAddFact(editingId, draft);
        onAnnouncement?.(`Bullet point added to ${institution}`);
      }
      setModalFactDraft("");
    } else {
      setDraftFacts((prev) => [...prev, draft]);
      onAnnouncement?.("Draft bullet point added");
      setModalFactDraft("");
    }
  };

  const handleAddCardBullet = (eduId: string, instName: string) => {
    const draft = (cardBulletDrafts[eduId] || "").trim();
    if (!draft) return;

    onAddFact?.(eduId, draft);
    setCardBulletDrafts((prev) => ({ ...prev, [eduId]: "" }));
    onAnnouncement?.(`Bullet point added to ${instName}`);
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
            const dateDisplay = formatDateRange(edu.start_date, edu.end_date);
            const locationDisplay = [edu.location?.city, edu.location?.region]
              .filter(Boolean)
              .join(", ");

            return (
              <li
                key={edu.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
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
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      {dateDisplay && <span>{dateDisplay}</span>}
                      {locationDisplay && (
                        <>
                          <span aria-hidden="true">•</span>
                          <span>{locationDisplay}</span>
                        </>
                      )}
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
                      onClick={(e) => handleOpenEdit(edu, e)}
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
                </div>

                {/* Polymorphic Facts / Bullet points for this education record */}
                {(Boolean(edu.facts && edu.facts.length > 0) || Boolean(onAddFact)) && (
                  <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Key Achievements &amp; Bullet Points
                    </h4>
                    {edu.facts && edu.facts.length > 0 && (
                      <ul className="mt-2 space-y-2">
                        {edu.facts.map((fact) => (
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
                            {onDeleteFact && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  onDeleteFact(fact.id);
                                  onAnnouncement?.("Deleted bullet point");
                                }}
                                className="h-6 w-6 p-0 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                                aria-label={`Delete bullet point ${fact.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    {onAddFact && (
                      <div className="mt-3 flex items-center gap-2">
                        <label
                          htmlFor={`edu-bullet-input-${edu.id}`}
                          className="sr-only"
                        >
                          New bullet point for {edu.institution}
                        </label>
                        <input
                          id={`edu-bullet-input-${edu.id}`}
                          type="text"
                          value={cardBulletDrafts[edu.id] || ""}
                          onChange={(e) =>
                            setCardBulletDrafts((prev) => ({
                              ...prev,
                              [edu.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddCardBullet(edu.id, edu.institution);
                            }
                          }}
                          placeholder="Add quantifiable bullet point (markdown supported)..."
                          className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => handleAddCardBullet(edu.id, edu.institution)}
                          aria-label={`Add bullet to ${edu.institution}`}
                        >
                          Add Bullet
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Add / Edit Education Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className={FORM_DIALOG_CONTENT_CLASS}
          onCloseAutoFocus={(e) => {
            if (triggerRef.current) {
              e.preventDefault();
              const el = triggerRef.current;
              triggerRef.current = null;
              el.focus();
            }
          }}
        >
          <form noValidate onSubmit={handleSaveDialog}>
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
                  Institution / School <span className="text-red-500">*</span>
                </label>
                <input
                  ref={institutionInputRef}
                  id="edu-institution"
                  required
                  type="text"
                  placeholder="e.g. Stanford University"
                  value={institution}
                  onChange={(e) => {
                    setInstitution(e.target.value);
                    if (institutionError) setInstitutionError(null);
                  }}
                  aria-invalid={Boolean(institutionError)}
                  aria-describedby={institutionError ? "edu-institution-error" : undefined}
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
                {institutionError && (
                  <p
                    id="edu-institution-error"
                    role="alert"
                    className="mt-1 text-xs text-red-600 dark:text-red-400"
                  >
                    {institutionError}
                  </p>
                )}
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
                    type="date"
                    placeholder="YYYY-MM-DD"
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
                    type="date"
                    placeholder="YYYY-MM-DD"
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

              {/* Collapsible Extended Details */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowExtendedDetails((prev) => !prev)}
                  aria-expanded={showExtendedDetails}
                  aria-controls="edu-extended-details"
                  className="flex items-center justify-between w-full text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded py-1"
                >
                  <span>Extended Details (Location, Facts)</span>
                  {showExtendedDetails ? (
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>

                {showExtendedDetails && (
                  <div id="edu-extended-details" className="mt-4 space-y-4">
                    {/* Location Section */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="edu-city"
                          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          City
                        </label>
                        <input
                          id="edu-city"
                          type="text"
                          placeholder="e.g. Stanford"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="edu-region"
                          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                        >
                          State / Region
                        </label>
                        <input
                          id="edu-region"
                          type="text"
                          placeholder="e.g. CA"
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Facts / Achievements Section */}
                    <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Key Achievements &amp; Bullet Points
                      </h4>

                      {/* If editing: render current facts from education item */}
                      {editingId && currentEdu?.facts && currentEdu.facts.length > 0 && (
                        <ul className="space-y-1.5" aria-label="Current education facts">
                          {currentEdu.facts.map((fact) => (
                            <li
                              key={fact.id}
                              className="flex items-start justify-between gap-2 rounded bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                            >
                              <div className="flex items-start gap-1.5">
                                <ShortIdBadge
                                  id={fact.id}
                                  shortId={(fact as { short_id?: string }).short_id}
                                  className="shrink-0"
                                />
                                <span>{fact.statement}</span>
                              </div>
                              {onDeleteFact && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    onDeleteFact(fact.id);
                                    onAnnouncement?.("Deleted bullet point");
                                  }}
                                  className="h-5 w-5 p-0 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                                  aria-label={`Delete bullet point ${fact.id}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* If creating: render draft facts */}
                      {!editingId && draftFacts.length > 0 && (
                        <ul className="space-y-1.5" aria-label="Draft education facts">
                          {draftFacts.map((stmt, idx) => (
                            <li
                              key={idx}
                              className="flex items-start justify-between gap-2 rounded bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                            >
                              <span>{stmt}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDraftFacts((prev) => prev.filter((_, i) => i !== idx));
                                  onAnnouncement?.("Removed draft bullet point");
                                }}
                                className="h-5 w-5 p-0 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                                aria-label={`Remove draft bullet ${idx + 1}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Add fact input */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          id="edu-modal-fact-input"
                          type="text"
                          value={modalFactDraft}
                          onChange={(e) => setModalFactDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleModalAddBullet();
                            }
                          }}
                          placeholder="Add achievement or bullet point..."
                          className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={handleModalAddBullet}
                          aria-label="Add Bullet"
                        >
                          Add Bullet
                        </Button>
                      </div>
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
              <Button type="submit">Save Education</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
