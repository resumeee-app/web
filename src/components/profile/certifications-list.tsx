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
  FORM_DIALOG_CONTENT_CLASS,
} from "@/components/ui/dialog";
import { ShortIdBadge } from "./short-id-badge";
import { formatDateDisplay, formatDateInput } from "@/lib/date";
import type { components } from "@/api/schema";

/**
 * Props for the CertificationsList component.
 */
export interface CertificationsListProps {
  /** Array of certifications from canonical profile snapshot */
  certifications: components["schemas"]["Certification"][];
  /** Callback to create a new certification record */
  onAddCertification: (
    data: components["schemas"]["CreateCertificationRequest"]
  ) => void;
  /** Callback to update an existing certification record */
  onUpdateCertification: (
    id: string,
    data: components["schemas"]["UpdateCertificationRequest"]
  ) => void;
  /** Callback to delete a certification record by ID */
  onDeleteCertification: (id: string) => void;
  /** Optional accessible live-region announcement handler */
  onAnnouncement?: (message: string) => void;
  /** Optional container class name */
  className?: string;
}

/**
 * Accessible list view and modal management component for Professional Certifications.
 * Allows users to add, edit, and remove certifications with compact ShortID badges and verification links.
 * Features an accessible dialog responsively sized to at least 720px on viewports >= 640px.
 *
 * @param props - CertificationsListProps
 * @returns Accessible certifications manager element.
 */
export const CertificationsList: React.FC<CertificationsListProps> = ({
  certifications,
  onAddCertification,
  onUpdateCertification,
  onDeleteCertification,
  onAnnouncement,
  className,
}) => {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  // Form fields
  const [name, setName] = React.useState("");
  const [issuer, setIssuer] = React.useState("");
  const [date, setDate] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [urlError, setUrlError] = React.useState<string | null>(null);
  const [nameError, setNameError] = React.useState<string | null>(null);

  const triggerRef = React.useRef<HTMLElement | null>(null);
  const nameInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (dialogOpen && !triggerRef.current) {
      triggerRef.current = (document.activeElement as HTMLElement) || null;
    }
  }, [dialogOpen]);

  const handleOpenAdd = (e?: React.MouseEvent<HTMLElement>) => {
    triggerRef.current = (e?.currentTarget || document.activeElement) as HTMLElement;
    setEditingId(null);
    setName("");
    setIssuer("");
    setDate("");
    setUrl("");
    setUrlError(null);
    setNameError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (
    cert: components["schemas"]["Certification"],
    e?: React.MouseEvent<HTMLElement>
  ) => {
    triggerRef.current = (e?.currentTarget || document.activeElement) as HTMLElement;
    setEditingId(cert.id);
    setName(cert.name);
    setIssuer(cert.issuer || "");
    setDate(formatDateInput(cert.date));
    setUrl(cert.url || "");
    setUrlError(null);
    setNameError(null);
    setDialogOpen(true);
  };

  const handleSaveDialog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("Certification name is required.");
      nameInputRef.current?.focus();
      return;
    }
    setNameError(null);

    if (url.trim() && !isValidHttpUrl(url.trim())) {
      setUrlError("Please enter a valid HTTP or HTTPS URL.");
      return;
    }
    setUrlError(null);

    const payload: components["schemas"]["CreateCertificationRequest"] = {
      name: name.trim(),
      issuer: issuer.trim() || undefined,
      date: date.trim() || undefined,
      url: url.trim() || undefined,
    };

    if (editingId) {
      onUpdateCertification(editingId, payload);
      onAnnouncement?.(`Updated certification ${name}`);
    } else {
      onAddCertification(payload);
      onAnnouncement?.(`Added certification ${name}`);
    }

    setDialogOpen(false);
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Certifications</h2>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Professional licenses, accreditations, and verifiable credentials.
          </p>
        </div>
        <Button onClick={handleOpenAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add Certification</span>
        </Button>
      </div>

      {certifications.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-300">
            No certifications added yet. Click &ldquo;Add Certification&rdquo; to begin.
          </p>
        </div>
      ) : (
        <ul className="space-y-4" aria-label="Certifications list">
          {certifications.map((cert) => (
            <li
              key={cert.id}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {cert.name}
                  </h3>
                  <ShortIdBadge
                    id={cert.id}
                    shortId={(cert as { short_id?: string }).short_id}
                  />
                </div>
                {cert.issuer && (
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {cert.issuer}
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-300">
                  {cert.date && <span>Issued: {formatDateDisplay(cert.date)}</span>}
                  {cert.url && isValidHttpUrl(cert.url) && (
                    <>
                      <span aria-hidden="true">•</span>
                      <a
                        href={cert.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                      >
                        <span>Verify Credential</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleOpenEdit(cert, e)}
                  aria-label={`Edit ${cert.name}`}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onDeleteCertification(cert.id);
                    onAnnouncement?.(`Deleted certification ${cert.name}`);
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/50"
                  aria-label={`Delete ${cert.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add / Edit Certification Dialog */}
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
                {editingId ? "Edit Certification" : "Add Certification"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label
                  htmlFor="cert-name"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Certification Name <span className="text-red-500">*</span>
                </label>
                <input
                  ref={nameInputRef}
                  id="cert-name"
                  required
                  type="text"
                  placeholder="e.g. AWS Certified Solutions Architect"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={nameError ? "cert-name-error" : undefined}
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
                {nameError && (
                  <p
                    id="cert-name-error"
                    role="alert"
                    className="mt-1 text-xs text-red-600 dark:text-red-400"
                  >
                    {nameError}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="cert-issuer"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Issuing Organization
                </label>
                <input
                  id="cert-issuer"
                  type="text"
                  placeholder="e.g. Amazon Web Services"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="cert-date"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Issue Date
                </label>
                <input
                  id="cert-date"
                  type="date"
                  placeholder="YYYY-MM-DD"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="cert-url"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Credential URL
                </label>
                <input
                  id="cert-url"
                  type="url"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (urlError) setUrlError(null);
                  }}
                  aria-invalid={urlError ? "true" : "false"}
                  aria-describedby={urlError ? "cert-url-error" : undefined}
                  className={cn(
                    "mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2",
                    urlError
                      ? "border-red-300 dark:border-red-500/70 bg-white dark:bg-slate-900 text-red-900 dark:text-red-200 placeholder-red-300 dark:placeholder-red-400/60 focus-visible:ring-red-500"
                      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus-visible:ring-indigo-500"
                  )}
                />
                {urlError && (
                  <p id="cert-url-error" className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {urlError}
                  </p>
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
              <Button type="submit">Save Certification</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
