import * as React from "react";
import {
  Plus,
  X,
  Tag,
  CheckCircle2,
  AlertCircle,
  Search,
  Pencil,
  Eye,
  Briefcase,
  FolderGit2,
  GraduationCap,
  Sparkles,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { components } from "@/api/schema";

/**
 * Record representing a single entity or fact linking to a skill in the career graph.
 */
export interface SkillProvenanceRecord {
  id: string;
  type: "experience" | "project" | "education" | "fact";
  title: string;
  subtitle?: string;
  detail?: string;
}

/**
 * Aggregated statistics and evidence provenance for a skill across the career graph.
 */
export interface SkillUsageStats {
  expCount: number;
  projCount: number;
  eduCount: number;
  factCount: number;
  totalRefs: number;
  isAttached: boolean;
  experiences: SkillProvenanceRecord[];
  projects: SkillProvenanceRecord[];
  education: SkillProvenanceRecord[];
  facts: SkillProvenanceRecord[];
}

/**
 * Props for the SkillsManager component.
 */
export interface SkillsManagerProps {
  /** Array of skill records from canonical profile snapshot */
  skills: components["schemas"]["Skill"][];
  /** Optional array of work experiences to resolve bidirectional skill usage */
  experiences?: components["schemas"]["WorkExperience"][];
  /** Optional array of projects to resolve bidirectional skill usage */
  projects?: components["schemas"]["Project"][];
  /** Optional array of education credentials to resolve bidirectional skill usage */
  education?: components["schemas"]["Education"][];
  /** Optional array of standalone facts to resolve bidirectional skill usage */
  facts?: components["schemas"]["Fact"][];
  /** Callback to create a new skill */
  onAddSkill: (data: components["schemas"]["CreateSkillRequest"]) => void;
  /** Optional callback to update an existing skill */
  onUpdateSkill?: (id: string, data: components["schemas"]["UpdateSkillRequest"]) => void;
  /** Callback to remove a skill by ID */
  onDeleteSkill: (id: string) => void;
  /** Optional accessible live-region announcement handler */
  onAnnouncement?: (message: string) => void;
  /** Optional container class name */
  className?: string;
}

const DEFAULT_CATEGORIES = [
  "Languages",
  "Frameworks",
  "Cloud",
  "Databases",
  "Tools & Methodologies",
];

type UsageFilter = "all" | "attached" | "unattached";
type OriginFilter = "all" | "custom" | "global";

/**
 * Enhanced SkillsManager component for the Master Profile and Career Graph.
 *
 * Implements:
 * - Clear Career Graph context explaining the role of skills as evidence anchors.
 * - Bidirectional provenance tracking across experiences, projects, education, and facts.
 * - Multi-axis filtering by usage status (All, In Use, Unattached) and origin (All, Custom, Global).
 * - Real-time search across skill names, categories, and keywords.
 * - Deep evidence inspection dialog detailing every linked achievement and career item.
 * - Modal and inline skill creation and custom skill editing.
 * - WCAG AA compliant keyboard accessibility and screen-reader announcements.
 */
export const SkillsManager: React.FC<SkillsManagerProps> = ({
  skills,
  experiences = [],
  projects = [],
  education = [],
  facts = [],
  onAddSkill,
  onUpdateSkill,
  onDeleteSkill,
  onAnnouncement,
  className,
}) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [usageFilter, setUsageFilter] = React.useState<UsageFilter>("all");
  const [originFilter, setOriginFilter] = React.useState<OriginFilter>("all");
  const [newDrafts, setNewDrafts] = React.useState<Record<string, string>>({});
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [customCategories, setCustomCategories] = React.useState<string[]>([]);

  // Dialog states
  const [evidenceSkill, setEvidenceSkill] = React.useState<components["schemas"]["Skill"] | null>(null);
  const [editingSkill, setEditingSkill] = React.useState<components["schemas"]["Skill"] | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editCategory, setEditCategory] = React.useState("");
  const [editProficiency, setEditProficiency] = React.useState("");
  const [editYears, setEditYears] = React.useState<string>("");

  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [addName, setAddName] = React.useState("");
  const [addCategory, setAddCategory] = React.useState("Languages");
  const [addProficiency, setAddProficiency] = React.useState("");
  const [addYears, setAddYears] = React.useState<string>("");

  // Consolidate skills from the root list as well as nested in experiences, projects, education, and facts
  const consolidatedSkills = React.useMemo(() => {
    const map = new Map<string, components["schemas"]["Skill"]>();
    (skills || []).forEach((s) => {
      if (s.id) map.set(s.id, s);
    });
    experiences.forEach((exp) => {
      exp.skills?.forEach((s) => {
        if (s.id && !map.has(s.id)) map.set(s.id, s);
      });
      exp.facts?.forEach((f) => {
        f.skills?.forEach((s) => {
          if (s.id && !map.has(s.id)) map.set(s.id, s);
        });
      });
    });
    projects.forEach((proj) => {
      proj.skills?.forEach((s) => {
        if (s.id && !map.has(s.id)) map.set(s.id, s);
      });
      proj.facts?.forEach((f) => {
        f.skills?.forEach((s) => {
          if (s.id && !map.has(s.id)) map.set(s.id, s);
        });
      });
    });
    education.forEach((edu) => {
      edu.facts?.forEach((f) => {
        f.skills?.forEach((s) => {
          if (s.id && !map.has(s.id)) map.set(s.id, s);
        });
      });
    });
    facts.forEach((f) => {
      f.skills?.forEach((s) => {
        if (s.id && !map.has(s.id)) map.set(s.id, s);
      });
    });
    return Array.from(map.values());
  }, [skills, experiences, projects, education, facts]);

  // Compute bidirectional skill usage counts and provenance records across experiences, projects, education, and facts
  const skillUsageMap = React.useMemo(() => {
    const nameToId = new Map<string, string>();
    consolidatedSkills.forEach((s) => {
      if (s.name) nameToId.set(s.name.trim().toLowerCase(), s.id);
    });

    const resolveSkillId = (skill: components["schemas"]["Skill"]): string => {
      if (skill.id) return skill.id;
      if (skill.name) {
        const found = nameToId.get(skill.name.trim().toLowerCase());
        if (found) return found;
      }
      return skill.id || "";
    };

    const expMap = new Map<string, Map<string, SkillProvenanceRecord>>();
    const projMap = new Map<string, Map<string, SkillProvenanceRecord>>();
    const eduMap = new Map<string, Map<string, SkillProvenanceRecord>>();
    const factMap = new Map<string, Map<string, SkillProvenanceRecord>>();

    consolidatedSkills.forEach((s) => {
      expMap.set(s.id, new Map());
      projMap.set(s.id, new Map());
      eduMap.set(s.id, new Map());
      factMap.set(s.id, new Map());
    });

    const targetMaps: Record<
      "experience" | "project" | "education" | "fact",
      Map<string, Map<string, SkillProvenanceRecord>>
    > = {
      experience: expMap,
      project: projMap,
      education: eduMap,
      fact: factMap,
    };

    const addUsage = (
      skillRef: components["schemas"]["Skill"],
      type: "experience" | "project" | "education" | "fact",
      record: SkillProvenanceRecord
    ) => {
      const skillId = resolveSkillId(skillRef);
      if (!skillId) return;

      const targetMap = targetMaps[type];
      let bucket = targetMap.get(skillId);
      if (!bucket) {
        bucket = new Map();
        targetMap.set(skillId, bucket);
      }
      bucket.set(record.id, record);
    };

    experiences.forEach((exp) => {
      const expRecord: SkillProvenanceRecord = {
        id: exp.id,
        type: "experience",
        title: exp.company || "Work Experience",
        subtitle: exp.role_title,
        detail: [exp.start_date, exp.is_current ? "Present" : exp.end_date]
          .filter(Boolean)
          .join(" – "),
      };

      exp.skills?.forEach((s) => {
        addUsage(s, "experience", expRecord);
      });

      exp.facts?.forEach((f) => {
        const factRecord: SkillProvenanceRecord = {
          id: f.id,
          type: "fact",
          title: exp.company ? `${exp.company} — ${exp.role_title || "Achievement"}` : "Achievement Fact",
          detail: f.statement,
        };
        f.skills?.forEach((s) => {
          addUsage(s, "experience", expRecord);
          addUsage(s, "fact", factRecord);
        });
      });
    });

    projects.forEach((proj) => {
      const projRecord: SkillProvenanceRecord = {
        id: proj.id,
        type: "project",
        title: proj.name || "Project",
        subtitle: proj.role,
        detail: proj.summary || proj.url,
      };

      proj.skills?.forEach((s) => {
        addUsage(s, "project", projRecord);
      });

      proj.facts?.forEach((f) => {
        const factRecord: SkillProvenanceRecord = {
          id: f.id,
          type: "fact",
          title: proj.name ? `${proj.name} Achievement` : "Project Fact",
          detail: f.statement,
        };
        f.skills?.forEach((s) => {
          addUsage(s, "project", projRecord);
          addUsage(s, "fact", factRecord);
        });
      });
    });

    education.forEach((edu) => {
      const eduRecord: SkillProvenanceRecord = {
        id: edu.id,
        type: "education",
        title: edu.institution || "Education",
        subtitle: [edu.degree, edu.field].filter(Boolean).join(" – "),
        detail: [edu.start_date, edu.end_date].filter(Boolean).join(" – "),
      };

      edu.facts?.forEach((f) => {
        const factRecord: SkillProvenanceRecord = {
          id: f.id,
          type: "fact",
          title: edu.institution ? `${edu.institution} Achievement` : "Education Fact",
          detail: f.statement,
        };
        f.skills?.forEach((s) => {
          addUsage(s, "education", eduRecord);
          addUsage(s, "fact", factRecord);
        });
      });
    });

    facts.forEach((f) => {
      const factRecord: SkillProvenanceRecord = {
        id: f.id,
        type: "fact",
        title: "Achievement Fact",
        detail: f.statement,
      };

      let parentRecord: SkillProvenanceRecord | null = null;
      let parentType: "experience" | "project" | "education" | null = null;

      if (f.owner_type === "work_experience" && f.owner_id) {
        const exp = experiences.find((e) => e.id === f.owner_id);
        parentType = "experience";
        parentRecord = {
          id: f.owner_id,
          type: "experience",
          title: exp?.company || "Work Experience",
          subtitle: exp?.role_title,
        };
      } else if (f.owner_type === "project" && f.owner_id) {
        const proj = projects.find((p) => p.id === f.owner_id);
        parentType = "project";
        parentRecord = {
          id: f.owner_id,
          type: "project",
          title: proj?.name || "Project",
          subtitle: proj?.role,
        };
      } else if (f.owner_type === "education" && f.owner_id) {
        const edu = education.find((e) => e.id === f.owner_id);
        parentType = "education";
        parentRecord = {
          id: f.owner_id,
          type: "education",
          title: edu?.institution || "Education",
          subtitle: [edu?.degree, edu?.field].filter(Boolean).join(" – "),
        };
      }

      f.skills?.forEach((s) => {
        addUsage(s, "fact", factRecord);
        if (parentType && parentRecord) {
          addUsage(s, parentType, parentRecord);
        }
      });
    });

    const resultMap = new Map<string, SkillUsageStats>();
    consolidatedSkills.forEach((s) => {
      const exps = Array.from(expMap.get(s.id)?.values() || []);
      const projs = Array.from(projMap.get(s.id)?.values() || []);
      const edus = Array.from(eduMap.get(s.id)?.values() || []);
      const fcts = Array.from(factMap.get(s.id)?.values() || []);

      const expCount = exps.length;
      const projCount = projs.length;
      const eduCount = edus.length;
      const factCount = fcts.length;
      const totalRefs = expCount + projCount + eduCount + factCount;

      resultMap.set(s.id, {
        expCount,
        projCount,
        eduCount,
        factCount,
        totalRefs,
        isAttached: totalRefs > 0,
        experiences: exps,
        projects: projs,
        education: edus,
        facts: fcts,
      });
    });

    return resultMap;
  }, [consolidatedSkills, experiences, projects, education, facts]);

  // Unique categories from consolidated skills, default categories, and custom categories
  const allCategories = React.useMemo(() => {
    const set = new Set<string>();
    DEFAULT_CATEGORIES.forEach((c) => set.add(c));
    customCategories.forEach((c) => set.add(c));
    consolidatedSkills.forEach((s) => {
      if (s.category && s.category.trim() !== "") {
        set.add(s.category.trim());
      }
    });
    return Array.from(set);
  }, [consolidatedSkills, customCategories]);

  // Filter skills based on search query, usage status, and origin
  const filteredSkills = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return consolidatedSkills.filter((s) => {
      // Search filter
      if (q) {
        const matchesName = (s.name || "").toLowerCase().includes(q);
        const matchesCategory = (s.category || "").toLowerCase().includes(q);
        const matchesKeywords = s.keywords?.some((k) => k.toLowerCase().includes(q));
        if (!matchesName && !matchesCategory && !matchesKeywords) {
          return false;
        }
      }

      // Usage status filter
      const stats = skillUsageMap.get(s.id);
      const isAttached = stats ? stats.isAttached : false;

      if (usageFilter === "attached" && !isAttached) {
        return false;
      }
      if (usageFilter === "unattached" && isAttached) {
        return false;
      }

      // Origin filter
      const isGlobal = Boolean(s.is_global || s.user_id === "system");
      if (originFilter === "custom" && isGlobal) {
        return false;
      }
      if (originFilter === "global" && !isGlobal) {
        return false;
      }

      return true;
    });
  }, [consolidatedSkills, searchQuery, usageFilter, originFilter, skillUsageMap]);

  // Group filtered skills by category
  const groupedSkills = React.useMemo(() => {
    const map: Record<string, components["schemas"]["Skill"][]> = {};
    allCategories.forEach((cat) => {
      map[cat] = [];
    });
    filteredSkills.forEach((s) => {
      const cat = s.category && s.category.trim() !== "" ? s.category.trim() : "Other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(s);
    });
    return map;
  }, [allCategories, filteredSkills]);

  // Compute total attached vs unattached counts
  const totalAttached = React.useMemo(() => {
    let count = 0;
    skillUsageMap.forEach((stats) => {
      if (stats.isAttached) count++;
    });
    return count;
  }, [skillUsageMap]);

  const totalUnattached = consolidatedSkills.length - totalAttached;

  const handleAddSkillToCategory = (category: string) => {
    const draft = (newDrafts[category] || "").trim();
    if (!draft) return;

    onAddSkill({
      name: draft,
      category,
    });
    setNewDrafts((prev) => ({ ...prev, [category]: "" }));
    onAnnouncement?.(`Added skill ${draft} to ${category}`);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = newCategoryName.trim();
    if (!cat) return;
    if (!allCategories.includes(cat)) {
      setCustomCategories((prev) => [...prev, cat]);
      onAnnouncement?.(`Added category ${cat}`);
    }
    setNewCategoryName("");
  };

  const handleOpenEdit = (skill: components["schemas"]["Skill"]) => {
    setEditingSkill(skill);
    setEditName(skill.name || "");
    setEditCategory(skill.category || "Languages");
    setEditProficiency(skill.proficiency || "");
    setEditYears(
      skill.years_experience !== undefined && skill.years_experience !== null
        ? String(skill.years_experience)
        : ""
    );
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;
    const trimmed = editName.trim();
    if (!trimmed) return;

    const parsedYears = editYears ? parseFloat(editYears) : undefined;

    onUpdateSkill?.(editingSkill.id, {
      name: trimmed,
      category: editCategory.trim() || undefined,
      proficiency: editProficiency.trim() || undefined,
      years_experience: !isNaN(Number(parsedYears)) ? parsedYears : undefined,
    });

    onAnnouncement?.(`Updated skill ${trimmed}`);
    setEditingSkill(null);
  };

  const handleCreateSkillModal = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = addName.trim();
    if (!trimmed) return;

    const parsedYears = addYears ? parseFloat(addYears) : undefined;

    onAddSkill({
      name: trimmed,
      category: addCategory.trim() || "Languages",
      proficiency: addProficiency.trim() || undefined,
      years_experience: !isNaN(Number(parsedYears)) ? parsedYears : undefined,
    });

    onAnnouncement?.(`Added skill ${trimmed}`);
    setIsAddModalOpen(false);
    setAddName("");
    setAddProficiency("");
    setAddYears("");
  };

  const activeEvidenceStats = evidenceSkill ? skillUsageMap.get(evidenceSkill.id) : null;

  return (
    <div
      className={cn(
        "space-y-6 bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm",
        className
      )}
    >
      {/* 1. Header & Career Graph Context Guide Banner */}
      <div className="rounded-lg border border-indigo-200 dark:border-indigo-950 bg-indigo-50/70 dark:bg-indigo-950/40 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <span>Skills &amp; Competencies in Career Graph</span>
            </h2>
            <p className="text-sm text-indigo-800 dark:text-indigo-300 max-w-3xl leading-relaxed">
              Skills represent verified competencies that ground your tailored resumes in concrete evidence.
              Linking skills to experiences, projects, and education proves hands-on mastery for ATS algorithms and hiring teams.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="shrink-0 gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add New Skill</span>
          </Button>
        </div>

        {/* Career Graph Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-md border border-indigo-100 dark:border-indigo-900 shadow-xs">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
              Total Skills
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
              {consolidatedSkills.length}
            </span>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-md border border-emerald-100 dark:border-emerald-950 shadow-xs">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 block flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>In Use (With Evidence)</span>
            </span>
            <span className="text-xl font-bold text-emerald-900 dark:text-emerald-200 mt-0.5 block">
              {totalAttached}
            </span>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-md border border-amber-100 dark:border-amber-950 shadow-xs">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400 block flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Awaiting Evidence</span>
            </span>
            <span className="text-xl font-bold text-amber-900 dark:text-amber-200 mt-0.5 block">
              {totalUnattached}
            </span>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-md border border-indigo-100 dark:border-indigo-900 shadow-xs">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
              Categories
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
              {allCategories.length}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Search, Status Filter & Origin Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none"
            aria-hidden="true"
          />
          <input
            role="searchbox"
            aria-label="Search skills"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills by name, category, or keyword..."
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-4 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
        </div>

        {/* Filter Groups */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Origin Filter */}
          <div
            role="group"
            aria-label="Filter skills by origin"
            className="inline-flex rounded-md shadow-xs p-1 bg-slate-100 dark:bg-slate-800"
          >
            <button
              type="button"
              aria-pressed={originFilter === "all"}
              onClick={() => setOriginFilter("all")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded transition-colors",
                originFilter === "all"
                  ? "bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              All Types
            </button>
            <button
              type="button"
              aria-pressed={originFilter === "custom"}
              onClick={() => setOriginFilter("custom")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded transition-colors",
                originFilter === "custom"
                  ? "bg-white dark:bg-slate-950 text-indigo-700 dark:text-indigo-400 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              Custom
            </button>
            <button
              type="button"
              aria-pressed={originFilter === "global"}
              onClick={() => setOriginFilter("global")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded transition-colors",
                originFilter === "global"
                  ? "bg-white dark:bg-slate-950 text-blue-700 dark:text-blue-400 shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              Global
            </button>
          </div>

          {/* Usage Status Filter */}
          <div
            role="group"
            aria-label="Filter skills by usage in profile"
            className="inline-flex rounded-md shadow-xs p-1 bg-slate-100 dark:bg-slate-800"
          >
            <button
              type="button"
              aria-pressed={usageFilter === "all"}
              onClick={() => setUsageFilter("all")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded transition-colors",
                usageFilter === "all"
                  ? "bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              All ({consolidatedSkills.length})
            </button>
            <button
              type="button"
              aria-pressed={usageFilter === "attached"}
              onClick={() => setUsageFilter("attached")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1",
                usageFilter === "attached"
                  ? "bg-white dark:bg-slate-950 text-emerald-700 dark:text-emerald-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              <span>In Use ({totalAttached})</span>
            </button>
            <button
              type="button"
              aria-pressed={usageFilter === "unattached"}
              onClick={() => setUsageFilter("unattached")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1",
                usageFilter === "unattached"
                  ? "bg-white dark:bg-slate-950 text-amber-700 dark:text-amber-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <AlertCircle className="h-3 w-3" aria-hidden="true" />
              <span>Unattached ({totalUnattached})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Categorized Skills Section */}
      <div className="space-y-6">
        {allCategories.map((category) => {
          const categorySkills = groupedSkills[category] || [];
          const inputId = `add-skill-input-${category.replace(/\s+/g, "-").toLowerCase()}`;

          // Skip empty categories if filtering
          const isFiltering = usageFilter !== "all" || originFilter !== "all" || searchQuery.trim() !== "";
          if (isFiltering && categorySkills.length === 0) {
            return null;
          }

          return (
            <div
              key={category}
              className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                  <span>{category}</span>
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {categorySkills.length} {categorySkills.length === 1 ? "skill" : "skills"}
                </span>
              </div>

              {/* Tag Badges List with Rich Usage Subtags and Interactive Evidence Actions */}
              <div
                className="flex flex-wrap gap-2.5 min-h-[36px] items-center"
                aria-label={`${category} skills`}
              >
                {categorySkills.length === 0 ? (
                  <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                    No skills in {category} yet.
                  </span>
                ) : (
                  categorySkills.map((skill) => {
                    const stats = skillUsageMap.get(skill.id);
                    const hasUsage = stats && stats.isAttached;
                    const isGlobal = Boolean(skill.is_global || skill.user_id === "system");

                    return (
                      <div
                        key={skill.id}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all shadow-xs",
                          hasUsage
                            ? "bg-indigo-50 border-indigo-200 text-indigo-950 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-200"
                            : "bg-white border-slate-300 text-slate-800 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                        )}
                      >
                        <span className="font-semibold">{skill.name || skill.id}</span>

                        {/* Origin badge */}
                        {isGlobal ? (
                          <span
                            className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-1.5 py-0.2 rounded-full font-medium"
                            title="Global verified standard catalog skill"
                          >
                            Global
                          </span>
                        ) : null}

                        {/* Usage indicators */}
                        {stats && stats.expCount > 0 && (
                          <span
                            className="text-[10px] bg-indigo-100 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-300 px-1.5 py-0.5 rounded-full"
                            title={`Used in ${stats.expCount} work experience${stats.expCount > 1 ? "s" : ""}`}
                          >
                            Used in {stats.expCount} experience{stats.expCount > 1 ? "s" : ""}
                          </span>
                        )}
                        {stats && stats.projCount > 0 && (
                          <span
                            className="text-[10px] bg-purple-100 dark:bg-purple-900/80 text-purple-800 dark:text-purple-300 px-1.5 py-0.5 rounded-full"
                            title={`Used in ${stats.projCount} project${stats.projCount > 1 ? "s" : ""}`}
                          >
                            Used in {stats.projCount} project{stats.projCount > 1 ? "s" : ""}
                          </span>
                        )}
                        {stats && stats.eduCount > 0 && (
                          <span
                            className="text-[10px] bg-sky-100 dark:bg-sky-900/80 text-sky-800 dark:text-sky-300 px-1.5 py-0.5 rounded-full"
                            title={`Used in ${stats.eduCount} education credential${stats.eduCount > 1 ? "s" : ""}`}
                          >
                            Used in {stats.eduCount} education
                          </span>
                        )}
                        {stats && stats.factCount > 0 && (
                          <span
                            className="text-[10px] bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded-full"
                            title={`Used in ${stats.factCount} achievement fact${stats.factCount > 1 ? "s" : ""}`}
                          >
                            Used in {stats.factCount} fact{stats.factCount > 1 ? "s" : ""}
                          </span>
                        )}
                        {stats && !stats.isAttached && (
                          <span
                            className="text-[10px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-full"
                            title="Not yet linked to any work experiences, projects, or education facts"
                          >
                            Unattached
                          </span>
                        )}

                        {/* View Evidence / Provenance Action */}
                        <button
                          type="button"
                          onClick={() => setEvidenceSkill(skill)}
                          className="rounded-full p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          aria-label={`View evidence for ${skill.name}`}
                          title={`Inspect evidence & provenance for ${skill.name}`}
                        >
                          <Eye className="h-3 w-3" aria-hidden="true" />
                        </button>

                        {/* Edit and Delete for custom skills */}
                        {!isGlobal && (
                          <>
                            {onUpdateSkill && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(skill)}
                                className="rounded-full p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                aria-label={`Edit skill ${skill.name}`}
                                title={`Edit skill ${skill.name}`}
                              >
                                <Pencil className="h-3 w-3" aria-hidden="true" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteSkill(skill.id);
                                onAnnouncement?.(`Removed skill ${skill.name}`);
                              }}
                              className="rounded-full p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                              aria-label={`Remove skill ${skill.name}`}
                              title={`Delete skill ${skill.name}`}
                            >
                              <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Skill to Category Form */}
              <div className="flex items-center gap-2 pt-1">
                <label htmlFor={inputId} className="sr-only">
                  New skill in {category}
                </label>
                <input
                  id={inputId}
                  type="text"
                  value={newDrafts[category] || ""}
                  onChange={(e) =>
                    setNewDrafts((prev) => ({
                      ...prev,
                      [category]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkillToCategory(category);
                    }
                  }}
                  placeholder={`Add ${category.toLowerCase()} skill...`}
                  className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 max-w-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => handleAddSkillToCategory(category)}
                  aria-label={`Add skill to ${category}`}
                >
                  Add
                </Button>
              </div>
            </div>
          );
        })}

        {/* Add New Category Form */}
        <form
          onSubmit={handleAddCategory}
          className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-800 pt-4"
        >
          <label htmlFor="new-category-input" className="sr-only">
            Add New Skill Category
          </label>
          <input
            id="new-category-input"
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New Category (e.g. Design Systems, DevOps)..."
            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 max-w-xs"
          />
          <Button type="submit" size="sm" variant="outline" className="gap-1">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add Category</span>
          </Button>
        </form>
      </div>

      {/* 4. Provenance & Evidence Dialog */}
      <Dialog
        open={evidenceSkill !== null}
        onOpenChange={(open) => {
          if (!open) setEvidenceSkill(null);
        }}
      >
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-950 dark:text-indigo-100">
              <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <span>{evidenceSkill?.name} — Provenance &amp; Evidence</span>
            </DialogTitle>
            <DialogDescription>
              Detailed Career Graph records and verifiable evidence supporting this competency.
            </DialogDescription>
          </DialogHeader>

          {evidenceSkill && activeEvidenceStats && (
            <div className="space-y-4 py-2">
              {/* Evidence Status Summary */}
              <div
                className={cn(
                  "p-3 rounded-md border flex items-center justify-between text-xs font-medium",
                  activeEvidenceStats.isAttached
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                    : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {activeEvidenceStats.isAttached ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  )}
                  <span>
                    {activeEvidenceStats.isAttached
                      ? `Verifiable Competency: Linked to ${activeEvidenceStats.totalRefs} record${activeEvidenceStats.totalRefs > 1 ? "s" : ""}`
                      : "Awaiting Evidence: Not yet linked to experiences, projects, or education"}
                  </span>
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Category: {evidenceSkill.category || "General"}
                </span>
              </div>

              {/* Linked Work Experiences */}
              {activeEvidenceStats.experiences.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Work Experiences ({activeEvidenceStats.experiences.length})</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {activeEvidenceStats.experiences.map((exp) => (
                      <li
                        key={exp.id}
                        className="rounded-md border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50 dark:bg-slate-800/60 text-xs"
                      >
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {exp.title}
                        </div>
                        {exp.subtitle && (
                          <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                            {exp.subtitle}
                          </div>
                        )}
                        {exp.detail && (
                          <div className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5">
                            {exp.detail}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Linked Projects */}
              {activeEvidenceStats.projects.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <FolderGit2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Projects ({activeEvidenceStats.projects.length})</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {activeEvidenceStats.projects.map((proj) => (
                      <li
                        key={proj.id}
                        className="rounded-md border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50 dark:bg-slate-800/60 text-xs"
                      >
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {proj.title}
                        </div>
                        {proj.subtitle && (
                          <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                            {proj.subtitle}
                          </div>
                        )}
                        {proj.detail && (
                          <div className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5 truncate">
                            {proj.detail}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Linked Education */}
              {activeEvidenceStats.education.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Education Credentials ({activeEvidenceStats.education.length})</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {activeEvidenceStats.education.map((edu) => (
                      <li
                        key={edu.id}
                        className="rounded-md border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50 dark:bg-slate-800/60 text-xs"
                      >
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {edu.title}
                        </div>
                        {edu.subtitle && (
                          <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                            {edu.subtitle}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Linked Quantifiable Achievement Facts */}
              {activeEvidenceStats.facts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Achievement Facts ({activeEvidenceStats.facts.length})</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {activeEvidenceStats.facts.map((f) => (
                      <li
                        key={f.id}
                        className="rounded-md border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50 dark:bg-slate-800/60 text-xs"
                      >
                        <div className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                          {f.detail}
                        </div>
                        {f.title && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Associated with: {f.title}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Guidance for Unattached Skills */}
              {!activeEvidenceStats.isAttached && (
                <div className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/30 p-3.5 text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Info className="h-4 w-4" aria-hidden="true" />
                    <span>How to provide evidence for this skill</span>
                  </div>
                  <p className="leading-relaxed">
                    Attach this skill to relevant work experiences, projects, or educational achievements.
                    Skills with linked evidence enable the AI tailoring engine to craft high-impact resume bullet points that withstand recruiter scrutiny and ATS parsing.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Edit Custom Skill Dialog */}
      <Dialog
        open={editingSkill !== null}
        onOpenChange={(open) => {
          if (!open) setEditingSkill(null);
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <span>Edit Skill</span>
            </DialogTitle>
            <DialogDescription>
              Update name, category, or proficiency for this custom skill.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
            <div>
              <label
                htmlFor="edit-skill-name"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Skill Name
              </label>
              <input
                id="edit-skill-name"
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="edit-skill-category"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Category
              </label>
              <input
                id="edit-skill-category"
                type="text"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="edit-skill-proficiency"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Proficiency Level
                </label>
                <select
                  id="edit-skill-proficiency"
                  value={editProficiency}
                  onChange={(e) => setEditProficiency(e.target.value)}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <option value="">Unspecified</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="edit-skill-years"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Years of Experience
                </label>
                <input
                  id="edit-skill-years"
                  type="number"
                  min="0"
                  step="0.5"
                  value={editYears}
                  onChange={(e) => setEditYears(e.target.value)}
                  placeholder="e.g. 3.5"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingSkill(null)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. Primary Add Skill to Profile Modal */}
      <Dialog
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (!open) {
            setAddName("");
            setAddProficiency("");
            setAddYears("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <span>Add Skill to Profile</span>
            </DialogTitle>
            <DialogDescription>
              Register a new competency in your career graph.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSkillModal} className="space-y-4 py-2">
            <div>
              <label
                htmlFor="add-skill-modal-name"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Skill Name
              </label>
              <input
                id="add-skill-modal-name"
                type="text"
                required
                placeholder="e.g. Distributed Systems, GraphQL..."
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="add-skill-modal-category"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Category
              </label>
              <input
                id="add-skill-modal-category"
                type="text"
                required
                placeholder="Languages, Frameworks, Cloud..."
                value={addCategory}
                onChange={(e) => setAddCategory(e.target.value)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="add-skill-modal-proficiency"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Proficiency Level
                </label>
                <select
                  id="add-skill-modal-proficiency"
                  value={addProficiency}
                  onChange={(e) => setAddProficiency(e.target.value)}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <option value="">Unspecified</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="add-skill-modal-years"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Years of Experience
                </label>
                <input
                  id="add-skill-modal-years"
                  type="number"
                  min="0"
                  step="0.5"
                  value={addYears}
                  onChange={(e) => setAddYears(e.target.value)}
                  placeholder="e.g. 4"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Create Skill
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
