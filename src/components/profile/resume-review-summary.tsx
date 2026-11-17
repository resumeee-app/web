import * as React from "react";
import {
  Briefcase,
  Wrench,
  GraduationCap,
  FolderGit2,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Info,
} from "lucide-react";
import { isPlainObject, type JSONResume } from "@/api/profile-queries";

const STANDARD_JSON_RESUME_KEYS = new Set<string>([
  "$schema",
  "basics",
  "work",
  "volunteer",
  "education",
  "awards",
  "certificates",
  "publications",
  "skills",
  "languages",
  "interests",
  "references",
  "projects",
  "meta",
]);

const EXTENDED_ARRAY_SECTIONS = [
  "volunteer",
  "awards",
  "publications",
  "languages",
  "interests",
  "references",
] as const;

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Inspects a parsed JSON Resume object and returns the names of extended standard sections,
 * schema/metadata blocks, and custom top-level keys that `core` preserves in profile
 * metadata for lossless round-trip export.
 *
 * @param resume - Parsed JSON Resume payload.
 * @returns Ordered list of preserved section/key names.
 */
export function getPreservedExtendedSections(resume: JSONResume): string[] {
  const preserved: string[] = [];

  if (asNonEmptyString(resume.$schema)) {
    preserved.push("$schema");
  }

  for (const key of EXTENDED_ARRAY_SECTIONS) {
    const val = resume[key];
    if (Array.isArray(val) && val.length > 0) {
      preserved.push(key);
    }
  }

  if (isPlainObject(resume.meta) && Object.keys(resume.meta).length > 0) {
    preserved.push("meta");
  }

  for (const key of Object.keys(resume)) {
    if (!STANDARD_JSON_RESUME_KEYS.has(key)) {
      const val = resume[key];
      if (val !== undefined && val !== null) {
        preserved.push(key);
      }
    }
  }

  return preserved;
}

/**
 * Props for the shared {@link ResumeReviewSummary} component.
 */
export interface ResumeReviewSummaryProps {
  /** Parsed JSON Resume draft or uploaded JSON Resume object to preview. */
  resume: JSONResume;
  /** Shows a subtle hint when `basics.name` is missing or blank. */
  showMissingNameNotice?: boolean;
}

/**
 * Renders a candidate JSON Resume review summary including Personal Details,
 * a 5-metric career graph summary grid (Work, Skills, Education, Projects, Certificates),
 * concise career item previews (work, education with highlights/courses, skills, projects, certificates),
 * and preserved extended/unmapped section notices.
 *
 * @param props - Component configuration defined in {@link ResumeReviewSummaryProps}.
 * @returns Accessible preview cards for staging resume imports.
 */
export const ResumeReviewSummary: React.FC<ResumeReviewSummaryProps> = ({
  resume,
  showMissingNameNotice = false,
}) => {
  const basics = isPlainObject(resume.basics) ? resume.basics : undefined;
  const candidateName = asNonEmptyString(basics?.name);
  const candidateLabel = asNonEmptyString(basics?.label);
  const candidateEmail = asNonEmptyString(basics?.email);
  const candidatePhone = asNonEmptyString(basics?.phone);
  const candidateSummary = asNonEmptyString(basics?.summary);
  const locationObj = isPlainObject(basics?.location)
    ? basics.location
    : undefined;
  const locationCity = asNonEmptyString(locationObj?.city);
  const locationRegion = asNonEmptyString(locationObj?.region);

  const workItems = (Array.isArray(resume.work) ? resume.work : []).filter(
    isPlainObject
  );
  const skillItems = (Array.isArray(resume.skills) ? resume.skills : []).filter(
    isPlainObject
  );
  const educationItems = (
    Array.isArray(resume.education) ? resume.education : []
  ).filter(isPlainObject);
  const projectItems = (
    Array.isArray(resume.projects) ? resume.projects : []
  ).filter(isPlainObject);
  const certificateItems = (
    Array.isArray(resume.certificates) ? resume.certificates : []
  ).filter(isPlainObject);
  const preservedSections = getPreservedExtendedSections(resume);

  const summaryMetrics = [
    {
      key: "work",
      label:
        workItems.length === 1
          ? "1 Work Experience"
          : `${workItems.length} Work Experiences`,
      count: workItems.length,
      icon: Briefcase,
    },
    {
      key: "skills",
      label:
        skillItems.length === 1 ? "1 Skill" : `${skillItems.length} Skills`,
      count: skillItems.length,
      icon: Wrench,
    },
    {
      key: "education",
      label:
        educationItems.length === 1
          ? "1 Education"
          : `${educationItems.length} Education`,
      count: educationItems.length,
      icon: GraduationCap,
    },
    {
      key: "projects",
      label:
        projectItems.length === 1
          ? "1 Project"
          : `${projectItems.length} Projects`,
      count: projectItems.length,
      icon: FolderGit2,
    },
    {
      key: "certificates",
      label:
        certificateItems.length === 1
          ? "1 Certificate"
          : `${certificateItems.length} Certificates`,
      count: certificateItems.length,
      icon: ShieldCheck,
    },
  ];

  const hasCareerPreviewItems =
    workItems.length > 0 ||
    skillItems.length > 0 ||
    educationItems.length > 0 ||
    projectItems.length > 0 ||
    certificateItems.length > 0;

  return (
    <div className="space-y-4">
      {/* Basics Card */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Personal Details
        </h3>
        <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {candidateName || "Unnamed Candidate"}
        </div>
        {candidateLabel && (
          <div className="text-sm text-slate-700 dark:text-slate-300">
            {candidateLabel}
          </div>
        )}
        <div className="flex flex-wrap gap-4 text-xs text-slate-700 dark:text-slate-300 pt-1">
          {candidateEmail && (
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{candidateEmail}</span>
            </span>
          )}
          {candidatePhone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{candidatePhone}</span>
            </span>
          )}
          {locationCity && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                {locationCity}
                {locationRegion ? `, ${locationRegion}` : ""}
              </span>
            </span>
          )}
        </div>
        {candidateSummary && (
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 line-clamp-3">
            {candidateSummary}
          </p>
        )}
        {showMissingNameNotice && !candidateName && (
          <p className="text-xs text-amber-800 dark:text-amber-300 pt-1">
            No basics.name was found in this JSON file; you can set your Full Name in Contact Info after importing.
          </p>
        )}
      </div>

      {/* 5-Metric Career Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {summaryMetrics.map(({ key, label, count, icon: Icon }) => (
          <div
            key={key}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-center"
          >
            <Icon
              className="h-4 w-4 mx-auto text-slate-500 dark:text-slate-300 mb-1"
              aria-hidden="true"
            />
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {count}
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300">
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Compact Career Items Preview */}
      {hasCareerPreviewItems && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Career Items Preview
          </h3>
          <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            {workItems.map((w, idx) => {
              const companyName =
                asNonEmptyString(w.name) ||
                asNonEmptyString(w.company) ||
                "Unspecified Company";
              const position = asNonEmptyString(w.position);
              const highlights = asStringList(w.highlights);
              return (
                <li key={`work-${idx}`} className="truncate">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {companyName}
                    {position ? ` — ${position}` : ""}
                  </span>
                  {highlights.length > 0 && (
                    <span className="text-slate-500 dark:text-slate-300">
                      {` (${highlights.length} ${
                        highlights.length === 1 ? "highlight" : "highlights"
                      })`}
                    </span>
                  )}
                </li>
              );
            })}
            {educationItems.map((e, idx) => {
              const institution =
                asNonEmptyString(e.institution) || "Unspecified Institution";
              const studyDetails = [
                asNonEmptyString(e.studyType),
                asNonEmptyString(e.area),
              ]
                .filter(Boolean)
                .join(", ");
              const highlights = asStringList(e.highlights);
              const courses = asStringList(e.courses);
              const metaParts: string[] = [];
              if (highlights.length > 0) {
                metaParts.push(
                  `${highlights.length} ${
                    highlights.length === 1 ? "highlight" : "highlights"
                  }`
                );
              }
              if (courses.length > 0) {
                metaParts.push(
                  `${courses.length} ${
                    courses.length === 1 ? "course" : "courses"
                  }: ${courses.join(", ")}`
                );
              }
              return (
                <li key={`edu-${idx}`} className="truncate">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {institution}
                    {studyDetails ? ` — ${studyDetails}` : ""}
                  </span>
                  {metaParts.length > 0 && (
                    <span className="text-slate-500 dark:text-slate-300">
                      {` (${metaParts.join(" · ")})`}
                    </span>
                  )}
                </li>
              );
            })}
            {skillItems.length > 0 && (
              <li className="truncate">
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  Skills:
                </span>{" "}
                <span>
                  {skillItems
                    .map((s) => {
                      const skillName =
                        asNonEmptyString(s.name) || "Unnamed Skill";
                      const skillLevel = asNonEmptyString(s.level);
                      return skillLevel
                        ? `${skillName} (${skillLevel})`
                        : skillName;
                    })
                    .join(", ")}
                </span>
              </li>
            )}
            {projectItems.map((p, idx) => (
              <li key={`proj-${idx}`} className="truncate">
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {asNonEmptyString(p.name) || "Untitled Project"}
                </span>
              </li>
            ))}
            {certificateItems.map((c, idx) => {
              const certName =
                asNonEmptyString(c.name) || "Untitled Certificate";
              const issuer = asNonEmptyString(c.issuer);
              return (
                <li key={`cert-${idx}`} className="truncate">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {certName}
                    {issuer ? ` — ${issuer}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Preserved Extended / Unmapped Sections Notice */}
      {preservedSections.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/60 dark:bg-indigo-950/40 p-3 text-xs text-indigo-800 dark:text-indigo-200">
          <Info
            className="h-4 w-4 flex-shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <span className="font-semibold">
              Preserved extended sections (retained for round-trip JSON Resume export):
            </span>{" "}
            <span className="font-mono">{preservedSections.join(", ")}</span>
          </div>
        </div>
      )}
    </div>
  );
};
