# Frontend Agent Guidelines

The primary agentic engineering guidelines for Resumeee are documented in the repository root at:
[`../AGENTS.md`](../AGENTS.md)

Please review `../AGENTS.md` for complete protocols covering:
- **Pure Client-Side SPA Invariants (Zero SSR)**
- **Radix UI Unstyled Primitives & WAI-ARIA 1.2 Compliance**
- **Contract-First OpenAPI TypeScript Client Generation (`openapi-typescript`)**
- **TanStack Query Caching & State Management**
- **TDD Workflow with Vitest, React Testing Library, and `vitest-axe`**
- **Cloud Object Storage (R2, S3, GCS) Deployment Recipes**

---

## UI Theme & WCAG Contrast Guidelines

All UI components in the React SPA must fully support dual dark and light themes with strict compliance with **WCAG 2.1 AA** contrast criteria:

1. **WCAG 2.1 AA Contrast Ratios**:
   - **Normal Body & Heading Text**: Minimum contrast ratio of **4.5:1** against the underlying background.
   - **Large Text & Graphical Objects / UI Components**: Minimum contrast ratio of **3.0:1** against adjacent colors.

2. **Semantic Design Token Architecture**:
   - Token values are authored as HSL components in `src/index.css` under `:root` (light) and `.dark` (dark mode).
   - Tailwind integrates these tokens via `tailwind.config.js` using `hsl(var(--<token>))`.
   - Semantic color pairs:
     - `background` / `foreground`
     - `card` / `card-foreground`
     - `popover` / `popover-foreground`
     - `muted` / `muted-foreground`
     - `primary` / `primary-foreground`
     - `secondary` / `secondary-foreground`
     - `accent` / `accent-foreground`
     - `destructive` / `destructive-foreground`
     - `border`, `input`, `ring`

3. **Mandatory Token Usage & Anti-Patterns**:

   | Forbidden Hardcoded Class | Required Semantic Class / Paired Variant | Purpose / Contrast Requirement |
   | :--- | :--- | :--- |
   | `bg-white` (bare) | `bg-card` OR `bg-white dark:bg-slate-900` | Card, dialog, or surface background |
   | `bg-slate-50` (bare) | `bg-background` OR `bg-slate-50 dark:bg-slate-950` | Page backdrop canvas |
   | `text-slate-900` (bare) | `text-foreground` OR `text-slate-900 dark:text-slate-100` | Primary headings and text |
   | `text-slate-500` / `600` (bare) | `text-muted-foreground` OR `text-slate-500 dark:text-slate-400` | Secondary description copy (>= 4.5:1) |
   | `border-slate-200` (bare) | `border-border` OR `border-slate-200 dark:border-slate-800` | Surface boundaries & dividers (>= 3:1) |
   | `border-slate-300` (bare) | `border-input` OR `border-slate-300 dark:border-slate-700` | Input controls and borders |

4. **Automated Verification & Quality Gates**:
   Always run the automated static theme guard and contrast test suites when authoring or modifying components:
   ```bash
   npx vitest run src/lib/theme-contrast.test.ts src/lib/theme-audit.test.ts src/lib/theme-rendering.test.tsx
   ```

