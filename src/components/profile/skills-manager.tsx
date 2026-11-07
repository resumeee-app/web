import * as React from "react";
import { Plus, X, Tag, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { components } from "@/api/schema";

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
  /** Optional array of standalone facts to resolve bidirectional skill usage */
  facts?: components["schemas"]["Fact"][];
  /** Callback to create a new skill in a given category */
  onAddSkill: (data: components["schemas"]["CreateSkillRequest"]) => void;
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

interface SkillUsageStats {
  expCount: number;
  projCount: number;
  factCount: number;
  totalRefs: number;
  isAttached: boolean;
}

/**
 * Formalized SkillsManager component with categorized tag organization,
 * bidirectional achievement/experience usage tracking, filtering, and WCAG AA accessibility.
 *
 * @param props - SkillsManagerProps
 * @returns Accessible, categorized skills manager element.
 */
export const SkillsManager: React.FC<SkillsManagerProps> = ({
  skills,
  experiences = [],
  projects = [],
  facts = [],
  onAddSkill,
  onDeleteSkill,
  onAnnouncement,
  className,
}) => {
  const [newDrafts, setNewDrafts] = React.useState<Record<string, string>>({});
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [customCategories, setCustomCategories] = React.useState<string[]>([]);
  const [usageFilter, setUsageFilter] = React.useState<UsageFilter>("all");

  // Consolidate skills from the root list as well as nested in experiences, projects, and facts
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
    facts.forEach((f) => {
      f.skills?.forEach((s) => {
        if (s.id && !map.has(s.id)) map.set(s.id, s);
      });
    });
    return Array.from(map.values());
  }, [skills, experiences, projects, facts]);

  // Compute bidirectional skill usage counts across experiences, projects, and facts
  const skillUsageMap = React.useMemo(() => {
    const expIDsBySkill = new Map<string, Set<string>>();
    const projIDsBySkill = new Map<string, Set<string>>();
    const factIDsBySkill = new Map<string, Set<string>>();

    consolidatedSkills.forEach((s) => {
      expIDsBySkill.set(s.id, new Set<string>());
      projIDsBySkill.set(s.id, new Set<string>());
      factIDsBySkill.set(s.id, new Set<string>());
    });

    const addSkillUsage = (
      skillID: string,
      type: "exp" | "proj" | "fact",
      entityID: string
    ) => {
      if (!entityID) return;
      if (type === "exp") {
        let set = expIDsBySkill.get(skillID);
        if (!set) {
          set = new Set<string>();
          expIDsBySkill.set(skillID, set);
        }
        set.add(entityID);
      } else if (type === "proj") {
        let set = projIDsBySkill.get(skillID);
        if (!set) {
          set = new Set<string>();
          projIDsBySkill.set(skillID, set);
        }
        set.add(entityID);
      } else if (type === "fact") {
        let set = factIDsBySkill.get(skillID);
        if (!set) {
          set = new Set<string>();
          factIDsBySkill.set(skillID, set);
        }
        set.add(entityID);
      }
    };

    experiences.forEach((exp) => {
      exp.skills?.forEach((s) => {
        addSkillUsage(s.id, "exp", exp.id);
      });
      exp.facts?.forEach((f) => {
        f.skills?.forEach((s) => {
          addSkillUsage(s.id, "exp", exp.id);
          addSkillUsage(s.id, "fact", f.id);
        });
      });
    });

    projects.forEach((proj) => {
      proj.skills?.forEach((s) => {
        addSkillUsage(s.id, "proj", proj.id);
      });
      proj.facts?.forEach((f) => {
        f.skills?.forEach((s) => {
          addSkillUsage(s.id, "proj", proj.id);
          addSkillUsage(s.id, "fact", f.id);
        });
      });
    });

    facts.forEach((f) => {
      f.skills?.forEach((s) => {
        addSkillUsage(s.id, "fact", f.id);
        if (f.owner_type === "work_experience" && f.owner_id) {
          addSkillUsage(s.id, "exp", f.owner_id);
        } else if (f.owner_type === "project" && f.owner_id) {
          addSkillUsage(s.id, "proj", f.owner_id);
        }
      });
    });

    const map = new Map<string, SkillUsageStats>();
    consolidatedSkills.forEach((s) => {
      const expCount = expIDsBySkill.get(s.id)?.size || 0;
      const projCount = projIDsBySkill.get(s.id)?.size || 0;
      const factCount = factIDsBySkill.get(s.id)?.size || 0;
      const totalRefs = expCount + projCount + factCount;
      map.set(s.id, {
        expCount,
        projCount,
        factCount,
        totalRefs,
        isAttached: totalRefs > 0,
      });
    });

    return map;
  }, [consolidatedSkills, experiences, projects, facts]);

  // Collect all unique categories from skills plus defaults and custom ones
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

  // Filter skills based on active usage filter
  const filteredSkills = React.useMemo(() => {
    return consolidatedSkills.filter((s) => {
      const stats = skillUsageMap.get(s.id);
      if (!stats) return true;

      if (usageFilter === "attached") {
        return stats.isAttached;
      }
      if (usageFilter === "unattached") {
        return !stats.isAttached;
      }
      return true;
    });
  }, [consolidatedSkills, skillUsageMap, usageFilter]);

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

  const totalAttached = React.useMemo(() => {
    let count = 0;
    skillUsageMap.forEach((stats) => {
      if (stats.isAttached) count++;
    });
    return count;
  }, [skillUsageMap]);

  const totalUnattached = consolidatedSkills.length - totalAttached;

  return (
    <div
      className={cn(
        "space-y-6 bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm",
        className
      )}
    >
      {/* Header and Usage Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Tag className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span>Skills & Competencies</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Categorized skills linked to experiences, projects, and verifiable achievements for ATS tailoring.
          </p>
        </div>

        {/* Usage Filter Buttons */}
        <div
          role="group"
          aria-label="Filter skills by usage in profile"
          className="inline-flex rounded-md shadow-sm p-1 bg-slate-100 dark:bg-slate-800"
        >
          <button
            type="button"
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

      {/* Categorized Skills Section */}
      <div className="space-y-6">
        {allCategories.map((category) => {
          const categorySkills = groupedSkills[category] || [];
          const inputId = `add-skill-input-${category.replace(/\s+/g, "-").toLowerCase()}`;

          // Skip empty categories if filtering to attached/unattached
          if (usageFilter !== "all" && categorySkills.length === 0) {
            return null;
          }

          return (
            <div
              key={category}
              className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/40"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {category}
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {categorySkills.length} {categorySkills.length === 1 ? "skill" : "skills"}
                </span>
              </div>

              {/* Tag Badges List with Usage Subtags */}
              <div
                className="flex flex-wrap gap-2 mb-3 min-h-[32px] items-center"
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

                    return (
                      <span
                        key={skill.id}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          hasUsage
                            ? "bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-200"
                            : "bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                        )}
                      >
                        <span className="font-semibold">{skill.name || skill.id}</span>

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
                            title="Not yet linked to any work experiences, projects, or facts"
                          >
                            Unattached
                          </span>
                        )}

                        {skill.is_global || skill.user_id === "system" ? (
                          <span
                            className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium"
                            title="Global verified skill (immutable)"
                          >
                            Global
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteSkill(skill.id);
                              onAnnouncement?.(`Removed skill ${skill.name}`);
                            }}
                            className="rounded-full p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            aria-label={`Remove skill ${skill.name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    );
                  })
                )}
              </div>

              {/* Add Skill to Category Form */}
              <div className="flex items-center gap-2">
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
                  className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 max-w-xs"
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

        {/* Add New Category Section */}
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
            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 max-w-xs"
          />
          <Button type="submit" size="sm" variant="outline" className="gap-1">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add Category</span>
          </Button>
        </form>
      </div>
    </div>
  );
};
