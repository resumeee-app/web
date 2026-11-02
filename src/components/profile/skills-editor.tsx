import * as React from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { components } from "@/api/schema";

/**
 * Props for the SkillsEditor component.
 */
export interface SkillsEditorProps {
  /** Array of skill records from canonical profile snapshot */
  skills: components["schemas"]["Skill"][];
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

/**
 * Tag-based categorized skill editor component.
 *
 * Implements:
 * - Grouped skill tags categorized by domain (e.g. Languages, Frameworks, Cloud, Databases).
 * - Inline keyboard-accessible tag removal (`aria-label="Remove skill <name>"`).
 * - Fast inline input for appending new skills directly under each category.
 * - Dynamic addition of custom user-defined skill categories.
 * - Screen-reader announcements for dynamic additions and removals conforming to WCAG 2.1 AA.
 *
 * @param props - SkillsEditorProps
 * @returns Accessible tag-based skills editor element.
 */
export const SkillsEditor: React.FC<SkillsEditorProps> = ({
  skills,
  onAddSkill,
  onDeleteSkill,
  onAnnouncement,
  className,
}) => {
  const [newDrafts, setNewDrafts] = React.useState<Record<string, string>>({});
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [customCategories, setCustomCategories] = React.useState<string[]>([]);

  // Collect all unique categories from skills plus defaults and custom ones
  const allCategories = React.useMemo(() => {
    const set = new Set<string>();
    DEFAULT_CATEGORIES.forEach((c) => set.add(c));
    customCategories.forEach((c) => set.add(c));
    skills.forEach((s) => {
      if (s.category && s.category.trim() !== "") {
        set.add(s.category.trim());
      }
    });
    return Array.from(set);
  }, [skills, customCategories]);

  // Group skills by category
  const groupedSkills = React.useMemo(() => {
    const map: Record<string, components["schemas"]["Skill"][]> = {};
    allCategories.forEach((cat) => {
      map[cat] = [];
    });
    skills.forEach((s) => {
      const cat = s.category && s.category.trim() !== "" ? s.category.trim() : "Other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(s);
    });
    return map;
  }, [allCategories, skills]);

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

  return (
    <div className={cn("space-y-6 bg-white p-6 rounded-lg border border-slate-200 shadow-sm", className)}>
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">Skills & Competencies</h2>
        <p className="text-sm text-slate-500">
          Tag-based categorized skills used by the ATS engine for tailored matching.
        </p>
      </div>

      <div className="space-y-6">
        {allCategories.map((category) => {
          const categorySkills = groupedSkills[category] || [];
          const inputId = `add-skill-input-${category.replace(/\s+/g, "-").toLowerCase()}`;

          return (
            <div
              key={category}
              className="rounded-lg border border-slate-200 p-4 bg-slate-50/50"
            >
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                {category}
              </h3>

              {/* Tag Badges List */}
              <div
                className="flex flex-wrap gap-2 mb-3 min-h-[32px] items-center"
                aria-label={`${category} skills`}
              >
                {categorySkills.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">
                    No skills in {category} yet.
                  </span>
                ) : (
                  categorySkills.map((skill) => (
                    <span
                      key={skill.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-medium text-indigo-800"
                    >
                      <span>{skill.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteSkill(skill.id);
                          onAnnouncement?.(`Removed skill ${skill.name}`);
                        }}
                        className="rounded-full p-0.5 text-indigo-600 hover:bg-indigo-200 hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        aria-label={`Remove skill ${skill.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
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
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 max-w-xs"
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
          className="flex items-center gap-2 border-t border-slate-200 pt-4"
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
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 max-w-xs"
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
