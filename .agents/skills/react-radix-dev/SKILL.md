---
name: react-radix-dev
description: Autonomous engineering skill for developing accessible Single-Page Applications (SPAs) with React, React Router, Radix UI primitives, Tailwind CSS, TypeScript, Vitest, and OpenAPI client generation.
---

# React + Radix UI Agentic Engineering Skill

This skill guides AI agents and autonomous engineering subagents in authoring, testing, and maintaining high-quality, accessible React frontend code in Resumeee.

---

## 1. Architectural Invariants

1. **Pure Client-Side SPA (No SSR)**:
   - Zero server-side rendering, Node server middleware, or framework-specific server actions.
   - All code must run natively in modern web browsers and compile to static HTML, JavaScript, and CSS deployable to cloud object storage (Cloudflare R2, AWS S3, Google Cloud Storage).
2. **Accessible by Default (WAI-ARIA 1.2 & WCAG 2.1 AA)**:
   - All interactive components (modals, popovers, dropdowns, tooltips, tabs) **must** be built upon unstyled Radix UI primitives (`@radix-ui/react-*`). Never build custom dropdowns or modals with generic `<div>` elements and click handlers.
   - All landmark regions must use semantic HTML5 elements: `<header>`, `<nav>`, `<main id="main-content">`, `<footer>`.
   - Every page must provide a skip-link (`#main-content`) accessible via keyboard navigation.
3. **OpenAPI Schema-First Typing**:
   - Never write hand-crafted, duplicated TypeScript request or response interfaces for REST endpoints.
   - Always run `npm run generate:api` to derive types directly from `openapi/openapi.yaml`.
   - Use `openapi-fetch` with typed `paths` from `src/api/schema.d.ts`.
4. **Separation of Server Cache vs UI State**:
   - Server data fetching, caching, deduplication, and invalidation belong in `@tanstack/react-query`.
   - Local component UI state (open/closed dialog, active tab, draft input) belongs in React hooks (`useState`, `useReducer`).
   - Never store duplicate server data in local `useState`.

---

## 2. Component Decomposition Standard

Organize components following a layered atomic and domain structure:

```
src/
├── api/                  # Typed OpenAPI client and query hooks
│   ├── client.ts         # Singleton and factory for openapi-fetch
│   └── schema.d.ts       # Generated from openapi/openapi.yaml
├── components/
│   ├── ui/               # Low-level accessible primitives wrapping Radix UI
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   └── tabs.tsx
│   └── layout/           # Shared page shell, header, footer, landmarks
│       ├── header.tsx
│       └── root-layout.tsx
├── pages/                # Route-level views (one per React Router route)
│   ├── home-page.tsx
│   └── not-found-page.tsx
├── lib/                  # Shared utilities (cn, formatting, validation)
└── test/                 # Test helpers, mocks, setupFiles
```

### Component Authoring Rules:
- **Polymorphism via `asChild`**: Low-level UI components should support `@radix-ui/react-slot` so buttons can seamlessly render as links (`<Button asChild><Link to="/...">...</Link></Button>`) without invalid nested interactive elements.
- **Defensive Props**: Explicitly type props with TypeScript interfaces. Export the interface alongside the component.
- **Compound Class Names**: Always merge classes via `cn(...)` from `@/lib/utils` to allow consumers to override layout or margin while preserving base focus rings and styling.

---

## 3. Accessibility & WAI-ARIA Checklist

Before considering any UI component complete, verify every item:

| Requirement | Implementation Rule |
| :--- | :--- |
| **Keyboard Navigation** | All interactive elements must be focusable using `Tab` and operable using `Enter` / `Space`. Radix handles roving tabindex for tabs, menus, and radiogroups. |
| **Focus Rings** | Never remove `:focus` outlines without replacing them with `:focus-visible:ring-2` with sufficient contrast against the background. |
| **Escape Dismissal** | Modals, sheets, and popovers must close when pressing `Escape`, and restore focus to the triggering element. |
| **Accessible Names** | Icon-only buttons must include `<span className="sr-only">Description</span>` or an `aria-label`. |
| **Heading Hierarchy** | Maintain logical heading order (`h1` -> `h2` -> `h3`). Never skip heading levels for visual styling (use Tailwind classes `text-xl font-bold` on semantic elements). |
| **Screen Reader Landmarks** | Navigation elements must have `aria-label="Main Navigation"` or similar disambiguation when multiple nav landmarks exist. |
| **Automated Axe Audit** | Every unit test suite must invoke `await axe(container)` and assert `expect(results).toHaveNoViolations()`. |

---

## 4. Test-Driven Development (TDD) with Vitest & Testing Library

Agents must follow strict TDD: Red -> Green -> Refactor.

### Testing Invariants:
1. **Query by User-Facing Role**:
   - Prefer: `screen.getByRole("button", { name: /save/i })`, `screen.getByRole("dialog")`, `screen.getByRole("heading", { level: 1 })`.
   - Acceptable: `screen.getByLabelText(...)`, `screen.getByText(...)`.
   - **Forbidden**: `screen.getByTestId(...)`, querying by CSS class name, or inspecting internal component state.
2. **User Events over FireEvent**:
   - Always use `@testing-library/user-event` with `userEvent.setup()` rather than `fireEvent`.
3. **Automated Axe Verification**:
   ```typescript
   import { axe } from "vitest-axe";

   it("has no accessibility violations", async () => {
     const { container } = render(<MyComponent />);
     const results = await axe(container);
     expect(results).toHaveNoViolations();
   });
   ```

---

## 5. Agent Command Reference

```bash
# 1. Regenerate types after OpenAPI updates
npm run generate:api

# 2. Run unit and accessibility tests
npm run test

# 3. Type-check with strict TypeScript compiler
npm run typecheck

# 4. Lint with ESLint and jsx-a11y plugin
npm run lint

# 5. Production static build verification
npm run build
```
