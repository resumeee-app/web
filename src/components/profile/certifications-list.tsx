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

  const handleOpenAdd = () => {
    setEditingId(null);
    setName("");
    setIssuer("");
    setDate("");
    setUrl("");
    setUrlError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (cert: components["schemas"]["Certification"]) => {
    setEditingId(cert.id);
    setName(cert.name);
    setIssuer(cert.issuer || "");
    setDate(cert.date || "");
    setUrl(cert.url || "");
    setUrlError(null);
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
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Certifications</h2>
          <p className="text-sm text-slate-500">
            Professional licenses, accreditations, and verifiable credentials.
          </p>
        </div>
        <Button onClick={handleOpenAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add Certification</span>
        </Button>
      </div>

      {certifications.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center">
          <p className="text-sm text-slate-500">
            No certifications added yet. Click &ldquo;Add Certification&rdquo; to begin.
          </p>
        </div>
      ) : (
        <ul className="space-y-4" aria-label="Certifications list">
          {certifications.map((cert) => (
            <li
              key={cert.id}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-semibold text-slate-900">
                    {cert.name}
                  </h3>
                  <ShortIdBadge
                    id={cert.id}
                    shortId={(cert as { short_id?: string }).short_id}
                  />
                </div>
                {cert.issuer && (
                  <div className="text-sm font-medium text-slate-700">
                    {cert.issuer}
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  {cert.date && <span>Issued: {cert.date}</span>}
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
                  onClick={() => handleOpenEdit(cert)}
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
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveDialog}>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Certification" : "Add Certification"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label
                  htmlFor="cert-name"
                  className="block text-sm font-medium text-slate-700"
                >
                  Certification Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="cert-name"
                  required
                  type="text"
                  placeholder="e.g. AWS Certified Solutions Architect"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="cert-issuer"
                  className="block text-sm font-medium text-slate-700"
                >
                  Issuing Organization
                </label>
                <input
                  id="cert-issuer"
                  type="text"
                  placeholder="e.g. Amazon Web Services"
                  value={issuer}
                  onChange={(e) => setIssuer(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="cert-date"
                  className="block text-sm font-medium text-slate-700"
                >
                  Issue Date
                </label>
                <input
                  id="cert-date"
                  type="text"
                  placeholder="YYYY-MM"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="cert-url"
                  className="block text-sm font-medium text-slate-700"
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
                      ? "border-red-300 text-red-900 placeholder-red-300 focus-visible:ring-red-500"
                      : "border-slate-300 placeholder-slate-400 focus-visible:ring-indigo-500"
                  )}
                />
                {urlError && (
                  <p id="cert-url-error" className="mt-1 text-xs text-red-600">
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
