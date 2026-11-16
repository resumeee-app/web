# AGENTS.md — Autonomous Engineering Guidelines for Resumeee Web

`web` is the pure client-side React SPA of the Resumeee ecosystem (`github.com/resumeee-app`). It talks to `server` only over HTTP, using the OpenAPI contract mirrored in `openapi/openapi.yaml`.

Any AI agent, developer subagent, or human engineer modifying this repository must follow the protocols, standards, and invariants in this document.

---

## 1. Repository Layout

```
web/
├── openapi/              # Snapshot of the server OpenAPI contract (see openapi/README.md)
├── deploy/               # Object storage & CDN deployment recipes (R2, S3, GCS, Nginx, Caddy)
├── public/               # Static assets
├── src/
│   ├── api/              # Typed OpenAPI client (generated via openapi-typescript)
│   ├── components/       # Accessible UI primitives (Radix UI) and layout
│   ├── pages/            # Route page views (React Router)
│   └── test/             # Vitest setup, axe accessibility matchers, mocks
└── package.json          # Frontend toolchain dependencies and scripts
```

---

## 2. Frontend Engineering Invariants (React + React Router + Radix UI)

### 2.1 Pure Client-Side SPA Architecture (Zero SSR)
- **Object Storage Deployment**: The application compiles to static assets (`index.html`, `assets/*.js`, `assets/*.css`) that can be hosted directly in cloud object storage (Cloudflare R2, AWS S3, Google Cloud Storage) behind a CDN.
- **Zero Server-Side Rendering (SSR)**: Never introduce Node server runtimes, server-side template rendering, or server-only framework primitives.
- **Client-Side Routing Fallback**: All client routing is handled via `react-router-dom` in browser router mode. Static hosting layers must serve `index.html` for all non-file route requests with an HTTP 200 status code.

### 2.2 Accessibility & WAI-ARIA 1.2 Compliance (MANDATORY)
- **Radix UI Unstyled Primitives**: All complex interactive elements (modals, dialogs, alert dialogs, dropdown menus, tabs, tooltips, popovers, selects) **must** be implemented using Radix UI primitives (`@radix-ui/react-*`). Custom, accessible-reinvented `div` implementations are strictly forbidden.
- **Keyboard Navigation & Trapping**:
  - All interactive elements must be focusable via `Tab` and actionable with `Enter` or `Space`.
  - Modals and dialogs must implement focus trapping and dismiss upon pressing `Escape`, returning focus to the trigger element upon close.
  - Tab lists and dropdowns must implement roving tabindex using keyboard arrow keys.
- **Focus Rings & Visibility**: Never remove focus rings without replacing them. All interactive controls must feature prominent `:focus-visible` ring indicators with a minimum 3:1 contrast ratio against the background.
- **Accessible Names & ARIA Attributes**:
  - Every button, input, link, and interactive control must possess an accessible name via visible text, `aria-label`, or `<span className="sr-only">`.
  - Icon-only buttons must always include hidden screen-reader text or `aria-label`.
  - Form controls must be explicitly associated with labels using `htmlFor` and matching `id`.
- **Automated Axe Testing**: Every component test suite must run `await axe(container)` and assert `expect(results).toHaveNoViolations()`.

### 2.3 Contract-First OpenAPI Integration
- **Canonical Schema**: `server` owns the API contract. `openapi/openapi.yaml` is the in-repo copy and the only source for API types here.
- **Generated Types**: Never manually write TypeScript interfaces for backend API entities. Run `npm run generate:api` to produce `src/api/schema.d.ts`, and commit the spec and generated types together.
- **Type-Safe Client**: All network communication must use `openapi-fetch` typed with `paths` from `schema.d.ts`.
- **Query & Cache Layer**: Use `@tanstack/react-query` for asynchronous state management, caching, deduplication, and optimistic updates.

### 2.4 State Management Principles
- **Server State vs. UI State**:
  - Server state (profiles, branches, versions, models) must live inside TanStack Query cache.
  - Ephemeral UI state (modals open/closed, active tab, form input drafts) lives in React hooks (`useState`, `useReducer`).
  - Never mirror or synchronize server state into local `useState` variables.
- **Immutable State Updates**: Never mutate state objects or arrays in-place. Always return fresh copies.

### 2.5 Print & ATS Resume Rendering
- Resume previews and exports must adhere to single-column ATS-friendly layouts.
- Print stylesheets (`@media print` in `src/index.css`) must suppress navigation bars, headers, buttons, and footers, enforce black-and-white typography, avoid awkward page breaks inside job experience items (`break-inside: avoid`), and support headless browser print-to-PDF export.

---

## 3. Test-Driven Development (TDD) with Vitest & React Testing Library

All development must proceed test-first: **Red -> Green -> Refactor**.

1. **Red**: Write a failing test in `src/.../*.test.tsx` targeting the public user interface before implementing the component:
   - Query elements by accessible role (`screen.getByRole("button", { name: /create resume/i })`, `screen.getByRole("dialog")`).
   - Simulate user actions with `@testing-library/user-event` (`await user.click(...)`).
   - Run `npm run test` and verify that the test fails for the expected reason.
2. **Green**: Implement the minimal component and Radix primitive logic to satisfy the test.
3. **Refactor**: Clean up styles, extract reusable hooks or primitives, and verify that all quality gates pass.
4. **Prohibited Testing Anti-Patterns**:
   - Never query by `data-testid`, CSS class names, or internal DOM structure.
   - Never inspect internal component state or call instance methods directly.
   - Never omit accessibility assertions (`axe(container)`).

---

## 4. Mandatory Quality Gates

Before any pull request can be opened or handed off for peer review, all of these must pass:

```bash
npm run typecheck   # Strict TypeScript type check
npm run lint        # ESLint with jsx-a11y and react-hooks rules
npm run test        # Unit, integration, and axe accessibility test suite
npm run build       # Production static build verification
```

---

## 5. Peer Review Checklist

### Spec
- [ ] Every functional requirement and human comment from the originating issue is completely fulfilled.
- [ ] Contract integrity: API calls and payloads conform to `openapi/openapi.yaml`.
- [ ] Zero-state & edge cases: empty lists, new-user state, network timeouts, and malformed responses are handled gracefully.
- [ ] Non-tautological tests: suites verify actual state transitions and side effects.

### Standards
- [ ] Structural DRYness: no duplicated preconditions, redundant checks, or copy-pasted error handling.
- [ ] No Fowler code smells: Primitive Obsession, Feature Envy, Long Parameter Lists, or God Components.
- [ ] Idiomatic patterns: narrow variable scopes, polymorphic Radix slot usage (`asChild`).
- [ ] Deep test assertions: accessibility roles, user interactions, and specific error conditions.

### Security
- [ ] Zero credential or internal trace leakage: API keys, tokens, and raw stack traces never appear in UI components or client logs.
- [ ] Untrusted text (API and LLM output) is rendered as React text nodes, never via `dangerouslySetInnerHTML`.
- [ ] Static deployment security: proper Content Security Policy (CSP), CORS expectations, and cache-control headers on static storage artifacts (`deploy/`).

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

