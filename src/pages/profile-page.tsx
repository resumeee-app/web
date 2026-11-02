import * as React from "react";
import { User, Briefcase, GraduationCap, Wrench, Save, RotateCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useBlocker, UNSAFE_DataRouterContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ContactForm, type ContactFormData } from "@/components/profile/contact-form";
import { ExperienceList } from "@/components/profile/experience-list";
import { ProjectsList } from "@/components/profile/projects-list";
import { SkillsEditor } from "@/components/profile/skills-editor";
import { EducationList } from "@/components/profile/education-list";
import { CertificationsList } from "@/components/profile/certifications-list";
import { UnsavedChangesDialog } from "@/components/profile/unsaved-changes-dialog";
import {
  PROFILE_FULL_QUERY_KEY,
  useFullProfile,
  useUpdateProfile,
  useCreateExperience,
  useUpdateExperience,
  useDeleteExperience,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useCreateEducation,
  useUpdateEducation,
  useDeleteEducation,
  useCreateSkill,
  useDeleteSkill,
  useCreateCertification,
  useUpdateCertification,
  useDeleteCertification,
  useCreateFact,
  useDeleteFact,
} from "@/api/profile-queries";
import type { components } from "@/api/schema";

/**
 * Evaluates whether current contact draft values differ from authoritative server snapshot.
 */
export function isContactFormDirty(
  original?: components["schemas"]["Profile"],
  draft?: ContactFormData | null
): boolean {
  if (!original || !draft) return false;
  if ((draft.full_name ?? "").trim() !== (original.full_name ?? "").trim()) return true;
  if ((draft.headline ?? "").trim() !== (original.headline ?? "").trim()) return true;
  if ((draft.summary ?? "").trim() !== (original.summary ?? "").trim()) return true;
  if ((draft.email ?? "").trim() !== (original.email ?? "").trim()) return true;
  if ((draft.phone ?? "").trim() !== (original.phone ?? "").trim()) return true;
  if ((draft.location?.city ?? "").trim() !== (original.location?.city ?? "").trim()) return true;
  if ((draft.location?.region ?? "").trim() !== (original.location?.region ?? "").trim()) return true;

  const origLinks = original.profiles || [];
  const draftLinks = draft.links || [];
  if (origLinks.length !== draftLinks.length) return true;
  for (let i = 0; i < origLinks.length; i++) {
    const o = origLinks[i];
    const d = draftLinks[i];
    if (o?.network !== d?.network || (o?.url ?? "") !== (d?.url ?? "")) {
      return true;
    }
  }
  return false;
}

interface RouterBlockerProps {
  when: boolean;
  onBlocked: (proceed: () => void, reset: () => void) => void;
}

const RouterBlocker: React.FC<RouterBlockerProps> = ({ when, onBlocked }) => {
  const blocker = useBlocker(when);

  React.useEffect(() => {
    if (blocker.state === "blocked") {
      onBlocked(
        () => blocker.proceed?.(),
        () => blocker.reset?.()
      );
    }
  }, [blocker, onBlocked]);

  return null;
};

/**
 * Master Profile & Career Graph Editor Page.
 *
 * Serves as the primary client-side SPA view for managing the single source of truth (canonical career graph)
 * from which all tailored resumes branch.
 *
 * Implements:
 * - Contact information form with strict client-side validation.
 * - Work experience & project lists with orderable controls and compact ShortID badges.
 * - Tag-based grouped skill editor by category.
 * - Education & certifications credentials editor.
 * - Dirty state tracking with explicit "Save Changes" action, optimistic updates, and unsaved changes confirmation dialog.
 * - Accessible WAI-ARIA live region for dynamic screen-reader status announcements.
 */
export const ProfilePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: snapshot, isLoading, isError, error } = useFullProfile();

  // Query mutations
  const updateProfileMutation = useUpdateProfile();
  const createExpMutation = useCreateExperience();
  const updateExpMutation = useUpdateExperience();
  const deleteExpMutation = useDeleteExperience();
  const createProjMutation = useCreateProject();
  const updateProjMutation = useUpdateProject();
  const deleteProjMutation = useDeleteProject();
  const createEduMutation = useCreateEducation();
  const updateEduMutation = useUpdateEducation();
  const deleteEduMutation = useDeleteEducation();
  const createSkillMutation = useCreateSkill();
  const deleteSkillMutation = useDeleteSkill();
  const createCertMutation = useCreateCertification();
  const updateCertMutation = useUpdateCertification();
  const deleteCertMutation = useDeleteCertification();
  const createFactMutation = useCreateFact();
  const deleteFactMutation = useDeleteFact();

  // Active tab state
  const [activeTab, setActiveTab] = React.useState("contact");

  // Dirty state tracking for contact form
  const [contactDraft, setContactDraft] = React.useState<ContactFormData | null>(null);
  const [isDirty, setIsDirty] = React.useState(false);
  const [isValid, setIsValid] = React.useState(true);
  const [discardDialogOpen, setDiscardDialogOpen] = React.useState(false);

  // React Router Data Router detection & navigation blocker state
  const hasDataRouter = Boolean(React.useContext(UNSAFE_DataRouterContext));
  const [pendingNavigation, setPendingNavigation] = React.useState<{
    proceed: () => void;
    reset: () => void;
  } | null>(null);

  const handleBlockedNavigation = React.useCallback(
    (proceed: () => void, reset: () => void) => {
      setPendingNavigation({ proceed, reset });
    },
    []
  );

  // Live accessibility announcement state
  const [announcement, setAnnouncement] = React.useState<string>("");

  const announce = React.useCallback((message: string) => {
    setAnnouncement(message);
  }, []);

  // Sync draft whenever server profile loads
  React.useEffect(() => {
    if (snapshot?.profile && !isDirty) {
      setContactDraft({
        full_name: snapshot.profile.full_name,
        headline: snapshot.profile.headline,
        summary: snapshot.profile.summary,
        email: snapshot.profile.email,
        phone: snapshot.profile.phone,
        location: snapshot.profile.location,
        links: snapshot.profile.profiles,
      });
    }
  }, [snapshot?.profile, isDirty]);

  // Window beforeunload guard to protect unsaved work on refresh or tab close
  React.useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  const handleContactChange = (updated: ContactFormData, valid: boolean) => {
    setContactDraft(updated);
    setIsValid(valid);
    setIsDirty(isContactFormDirty(snapshot?.profile, updated));
  };

  const handleSaveContact = async () => {
    if (!contactDraft || !isValid) return;

    try {
      await updateProfileMutation.mutateAsync({
        full_name: contactDraft.full_name,
        headline: contactDraft.headline,
        summary: contactDraft.summary,
        email: contactDraft.email,
        phone: contactDraft.phone,
        location: contactDraft.location,
        profiles: contactDraft.links,
      });
      setIsDirty(false);
      announce("Master profile updated successfully.");
    } catch {
      announce("Failed to save profile changes. Please try again.");
    }
  };

  const handleDiscardChanges = () => {
    if (snapshot?.profile) {
      setContactDraft({
        full_name: snapshot.profile.full_name,
        headline: snapshot.profile.headline,
        summary: snapshot.profile.summary,
        email: snapshot.profile.email,
        phone: snapshot.profile.phone,
        location: snapshot.profile.location,
        links: snapshot.profile.profiles,
      });
    }
    setIsDirty(false);
    setDiscardDialogOpen(false);
    announce("Unsaved changes discarded.");
  };

  const isDialogOpen = discardDialogOpen || pendingNavigation !== null;

  const handleConfirmDiscard = () => {
    handleDiscardChanges();
    if (pendingNavigation) {
      const { proceed } = pendingNavigation;
      setPendingNavigation(null);
      proceed();
    }
  };

  const handleCancelDiscard = () => {
    setDiscardDialogOpen(false);
    if (pendingNavigation) {
      const { reset } = pendingNavigation;
      setPendingNavigation(null);
      reset();
    }
  };

  if (isLoading) {
    return (
      <div
        className="flex min-h-[400px] items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Loading master profile career graph...
        </span>
      </div>
    );
  }

  if (isError || !snapshot) {
    return (
      <div
        className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-6 text-center"
        role="alert"
      >
        <h2 className="text-base font-semibold text-red-800 dark:text-red-200">
          Error loading master profile
        </h2>
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error?.message || "Unable to reach API server. Please retry later."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Screen-reader Live Region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Master Profile &amp; Career Graph
            </h1>
            {isDirty && (
              <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-600/20">
                Unsaved Changes
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Single-source-of-truth career records, skills, and quantifiable achievements.
          </p>
        </div>

        {/* Global Save / Discard Controls */}
        <div className="flex items-center gap-2">
          {isDirty && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDiscardDialogOpen(true)}
              className="gap-1.5"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Discard</span>
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSaveContact}
            disabled={!isDirty || !isValid || updateProfileMutation.isPending}
            className="gap-1.5"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span>
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1.5 gap-1 bg-slate-100 dark:bg-slate-800">
          <TabsTrigger
            value="contact"
            className="gap-1.5 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm"
          >
            <User className="h-4 w-4" aria-hidden="true" />
            <span>Contact Info</span>
          </TabsTrigger>
          <TabsTrigger
            value="experience"
            className="gap-1.5 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm"
          >
            <Briefcase className="h-4 w-4" aria-hidden="true" />
            <span>Experience &amp; Projects</span>
          </TabsTrigger>
          <TabsTrigger
            value="skills"
            className="gap-1.5 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm"
          >
            <Wrench className="h-4 w-4" aria-hidden="true" />
            <span>Skills</span>
          </TabsTrigger>
          <TabsTrigger
            value="education"
            className="gap-1.5 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 data-[state=active]:shadow-sm"
          >
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            <span>Education &amp; Certifications</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Contact Information */}
        <TabsContent value="contact" className="mt-6">
          {contactDraft && (
            <ContactForm
              initialData={contactDraft}
              onChange={handleContactChange}
            />
          )}
        </TabsContent>

        {/* Tab 2: Experience & Projects */}
        <TabsContent value="experience" className="mt-6 space-y-8">
          <ExperienceList
            experiences={snapshot.experiences || []}
            onReorder={(reordered) => {
              queryClient.setQueryData<components["schemas"]["MasterProfileSnapshot"]>(
                PROFILE_FULL_QUERY_KEY,
                (old) => (old ? { ...old, experiences: reordered } : old)
              );
              announce("Work experiences reordered.");
            }}
            onAddExperience={(expData) => createExpMutation.mutate(expData)}
            onUpdateExperience={(id, expData) =>
              updateExpMutation.mutate({ id, data: expData })
            }
            onDeleteExperience={(id) => deleteExpMutation.mutate(id)}
            onAddFact={(ownerId, statement) =>
              createFactMutation.mutate({
                owner_id: ownerId,
                owner_type: "work_experience",
                statement,
              })
            }
            onDeleteFact={(factId) => deleteFactMutation.mutate(factId)}
            onAnnouncement={announce}
          />

          <ProjectsList
            projects={snapshot.projects || []}
            onAddProject={(projData) => createProjMutation.mutate(projData)}
            onUpdateProject={(id, projData) =>
              updateProjMutation.mutate({ id, data: projData })
            }
            onDeleteProject={(id) => deleteProjMutation.mutate(id)}
            onAddFact={(ownerId, statement) =>
              createFactMutation.mutate({
                owner_id: ownerId,
                owner_type: "project",
                statement,
              })
            }
            onDeleteFact={(factId) => deleteFactMutation.mutate(factId)}
            onAnnouncement={announce}
          />
        </TabsContent>

        {/* Tab 3: Skills */}
        <TabsContent value="skills" className="mt-6">
          <SkillsEditor
            skills={snapshot.skills || []}
            onAddSkill={(skillData) => createSkillMutation.mutate(skillData)}
            onDeleteSkill={(id) => deleteSkillMutation.mutate(id)}
            onAnnouncement={announce}
          />
        </TabsContent>

        {/* Tab 4: Education & Certifications */}
        <TabsContent value="education" className="mt-6 space-y-8">
          <EducationList
            education={snapshot.education || []}
            onAddEducation={(eduData) => createEduMutation.mutate(eduData)}
            onUpdateEducation={(id, eduData) =>
              updateEduMutation.mutate({ id, data: eduData })
            }
            onDeleteEducation={(id) => deleteEduMutation.mutate(id)}
            onAnnouncement={announce}
          />

          <CertificationsList
            certifications={snapshot.certifications || []}
            onAddCertification={(certData) =>
              createCertMutation.mutate(certData)
            }
            onUpdateCertification={(id, certData) =>
              updateCertMutation.mutate({ id, data: certData })
            }
            onDeleteCertification={(id) => deleteCertMutation.mutate(id)}
            onAnnouncement={announce}
          />
        </TabsContent>
      </Tabs>

      {/* Navigation Away Guard for Unsaved Changes */}
      {hasDataRouter && (
        <RouterBlocker
          when={isDirty}
          onBlocked={handleBlockedNavigation}
        />
      )}

      {/* Discard Confirmation Dialog */}
      <UnsavedChangesDialog
        open={isDialogOpen}
        onConfirm={handleConfirmDiscard}
        onCancel={handleCancelDiscard}
      />
    </div>
  );
};
