# Object Storage & Static CDN Deployment Architecture

This directory provides deployment recipes and infrastructure configurations for serving the Resumeee Web SPA directly from cloud object storage (AWS S3, Cloudflare R2, Google Cloud Storage) or static edge web servers.

---

## 1. Single-Page Application (SPA) Hosting Invariants

The Resumeee Web UI is a pure client-side SPA with **zero server-side rendering (SSR)**.

### Architectural Principles:
1. **Static Distribution**: Build outputs in `web/dist/` consist solely of static files (`index.html`, JavaScript chunks, CSS stylesheets, images, and fonts).
2. **Client-Side Routing Fallback**: In HTML5 history mode (`createBrowserRouter`), URLs like `/resumes/123` or `/profile` do not correspond to physical files on disk. The storage or CDN layer **MUST** rewrite or serve `index.html` with an HTTP status of `200` for all non-file route requests.
3. **Asset Immutability & Cache Invalidation**:
   - `assets/*.js`, `assets/*.css`: Hashed filenames can be aggressively cached for 1 year (`Cache-Control: public, max-age=31536000, immutable`).
   - `index.html`: Must **never** be cached indefinitely (`Cache-Control: public, max-age=0, must-revalidate` or `no-cache`), ensuring instantaneous client updates upon deployment.
4. **CORS & API Security**:
   - The SPA interacts with the backend REST API (`/api/v1/*`).
   - If hosted on a distinct origin (e.g. `https://app.resumeee.io` calling `https://api.resumeee.io`), CORS headers must be configured on the backend server (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`).
   - If routed through a CDN or reverse proxy on the same domain (`/` -> object storage, `/api/` -> Go backend), no CORS overhead exists.

---

## 2. Deployment Recipes

- [**Cloudflare R2 & Cloudflare Pages / Workers**](./cloudflare-r2.md)
- [**AWS S3 + CloudFront CDN**](./s3-cloudfront.md)
- [**Google Cloud Storage (GCS) + Cloud CDN**](./gcs-cloud-cdn.md)
- [**Production Nginx Reverse Proxy**](./nginx.conf)
- [**Production Caddy Web Server**](./Caddyfile)
- [**Static Hosting SPA Redirects Rule**](./_redirects)
