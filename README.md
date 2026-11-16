<p align="center">
  <img src="./public/icons/logo-192x192.png" alt="Resumeee" width="96" />
</p>

# web

Client-side React Single-Page Application (SPA) for **Resumeee** (`github.com/resumeee-app/web`).

## What It Contains

- **Interactive Resume Workspace** — Master profile editor, role-targeted branch workbench, template/preset managers, and print-ready resume previews.
- **Static SPA Output** — Compiles to static assets (`dist/`) deployable to NGINX, Caddy, or cloud object storage (S3, R2, GCS), communicating with `server` over HTTP (`/api/v1`).
- **Pluggable Auth** — Supports local single-user Admin Mode (`ADMIN_MODE=true`) or injected `AuthAdapter` providers for multi-tenant deployments.

## How to Run

Requires **Node.js 20+** and **npm 10+**.

### 1. Configure Environment (Optional)

Create `.env.local` (see [`.env.example`](./.env.example)):

```bash
VITE_API_BASE_URL=/api/v1
VITE_API_PROXY_TARGET=http://localhost:8080
ADMIN_MODE=true
```

### 2. Install & Start Dev Server

Starts Vite with Hot Module Replacement at `http://localhost:5173`:

```bash
npm install
npm run dev
```

### 3. Production Build & Docker

```bash
npm run build
```

Or build and run the unprivileged NGINX container:

```bash
docker build -t resumeee-web .
docker run -d -p 3000:8080 --name resumeee-web resumeee-web
```

For full-stack Docker Compose setup, see the [`resumeee`](https://github.com/resumeee-app/resumeee) workspace repository.

### 4. Verification & API Types

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Regenerate API types from [`openapi/openapi.yaml`](./openapi/openapi.yaml):

```bash
npm run generate:api
```

---

## License & Trademarks

### License
Resumeee is licensed under the **GNU Affero General Public License v3.0 or later** ([AGPL-3.0-or-later](LICENSE)).

You are free to use, modify, and host this software. Under the AGPL, any modified versions distributed or hosted over a network must make their complete source code freely available under the same license terms.

For commercial inquiries or custom closed-source licensing arrangements, contact Ruben Rivera.

### Contributor Agreement
All external contributions are welcomed under the terms of our [Contributor License Agreement (CLA)](CLA.md). See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Trademark Notice
"Resumeee" and the Resumeee branding and logo are trademarks of Ruben Rivera. The AGPLv3 license gives you rights to the software code, but does not grant rights to use the official name, logo, or trademarks for derivative products or publicity without prior written permission.
