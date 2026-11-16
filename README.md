# Resumeee Web SPA (React + React Router + Radix UI)

Welcome to the frontend workspace for Resumeee. This is a Single-Page Application (SPA) built with React 18, React Router v6/v7, Radix UI unstyled primitives, Tailwind CSS, and TypeScript.

The frontend is strictly decoupled from server-side rendering (SSR), allowing it to be deployed into any cloud object storage (Cloudflare R2, AWS S3, Google Cloud Storage) and served via CDN, communicating with the Resumeee REST API (`server`) whose contract is mirrored in `openapi/openapi.yaml`.

---

## 1. Prerequisites & Toolchain

### Required Runtimes & Package Managers
- **Node.js**: `v20.0.0+` LTS or `v22.0.0+` LTS.
- **npm**: `v10.0.0+` (or `pnpm v9.0.0+` / `bun v1.1.0+`).
- **Git**: For version control and git worktree isolation.

Verify your environment:
```bash
node -v   # Expected >= v20.0.0
npm -v    # Expected >= v10.0.0
```

### Recommended IDE Extensions (VS Code / Cursor / Zed)
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier - Code formatter** (`esbenp.prettier-vscode`)
- **TypeScript and JavaScript Language Features** (built-in)

---

## 2. Environment Configuration

Create a `.env.local` file in the repository root for local environment overrides:

```bash
# Relative path or absolute URL pointing to the Resumeee REST API
VITE_API_BASE_URL=/api/v1

# Target server for the Vite development proxy
VITE_API_PROXY_TARGET=http://localhost:8080
```

When `VITE_API_BASE_URL` is set to `/api/v1`, requests in the browser go to `/api/v1/*`. During local development, the Vite dev server transparently proxies `/api` to `http://localhost:8080` (where `server` runs), completely avoiding CORS configuration issues.

---

## 3. Development Workflow

### Installation
```bash
npm install
```

### Start Development Server
Starts Vite dev server with Hot Module Replacement (HMR) at `http://localhost:5173`:
```bash
npm run dev
```

### Synchronize OpenAPI TypeScript Definitions
`openapi/openapi.yaml` is a copy of the authoritative contract published by `server`. Whenever the API contract changes, refresh that file and regenerate the strongly typed TypeScript interfaces:
```bash
npm run generate:api
```
This updates `src/api/schema.d.ts` without manual TypeScript authoring.

---

## 4. Quality Gates & Testing

All pull requests must pass the following quality gates:

| Gate | Command | Description |
| :--- | :--- | :--- |
| **Type Check** | `npm run typecheck` | Strict TypeScript compiler check (`tsc --noEmit`). |
| **Linting** | `npm run lint` | ESLint rules including `jsx-a11y` accessibility rules. |
| **Unit & A11y Tests** | `npm run test` | Vitest suite validating component states and `axe-core` compliance. |
| **Test Coverage** | `npm run test:coverage` | Vitest coverage report with v8 engine. |
| **Production Build** | `npm run build` | Compiles optimized static assets into `dist/`. |

---

## 5. Architectural Standards

### Radix UI Primitives & Accessibility (WAI-ARIA)
All interactive elements (dialogs, dropdowns, tooltips, popovers, tabs) must use unstyled Radix UI primitives (`@radix-ui/react-*`). Radix primitives handle:
- Keyboard interactions (Tab, Arrow keys, Escape to close).
- Focus management and focus trapping.
- ARIA roles, states, and properties (`aria-expanded`, `aria-controls`, `aria-describedby`).
- Accessible naming (`DialogTitle`, `DialogDescription`).

### Data Fetching & OpenAPI Client
- REST API queries and mutations use `@tanstack/react-query` combined with `openapi-fetch`.
- All requests are strictly typed against `paths` in `src/api/schema.d.ts`.
- Zero `any` casts or unvalidated response models.

### Object Storage Hosting & SPA Routing
- The build produces static files in `dist/` (`index.html`, `assets/*.js`, `assets/*.css`).
- Hosting providers must configure rewrite rules that route all unmatched paths (`/*`) to `index.html` with HTTP 200.
- See [`deploy/`](./deploy/) for deployment guides for AWS S3, Cloudflare R2, Google Cloud Storage, Nginx, and Caddy.

---

## 6. Docker Containerization

### Production Container (Unprivileged NGINX)
Build the optimized multi-stage production Docker image:
```bash
# Build production image from the repository root
docker build -t resumeee-web .

# Run production container listening on host port 3000 (container port 8080)
docker run -d -p 3000:8080 --name resumeee-web resumeee-web
```

### Full-Stack Docker Compose (Umbrella Workspace)
Run both the Go backend API and the React Web SPA together from the [resumeee](https://github.com/resumeee-app/resumeee) workspace repository:
```bash
docker compose up --build
# Web SPA available at: http://localhost:3000
# Backend API available at: http://localhost:8080
```

### Development with Live Reload (Umbrella Workspace)
Run both backend (`air` hot-reload) and frontend (`vite` HMR) with volume mounts:
```bash
DEV_UID=$(id -u) DEV_GID=$(id -g) docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
# Web SPA with HMR at: http://localhost:5173
```

---

## 7. License

GNU Affero General Public License v3.0 (AGPL-3.0). See [LICENSE](./LICENSE).
