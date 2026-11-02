# Deploying Resumeee SPA to Cloudflare R2 / Cloudflare Pages

Cloudflare offers low-latency global distribution with zero egress fees for object storage (R2) and integrated SPA hosting via Cloudflare Pages or Cloudflare Workers with Static Assets.

---

## Option A: Cloudflare Pages (Recommended for Single-Page Applications)

Cloudflare Pages provides automated git deployments, preview environments, and native SPA routing fallback.

### 1. Build Configuration in Cloudflare Dashboard
- **Framework Preset**: `Vite`
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `web`

### 2. Client-Side Routing Fallback
Cloudflare Pages automatically processes the `web/deploy/_redirects` file when copied or placed into `web/public/_redirects`:
```
/*    /index.html   200
```
Alternatively, configure the Cloudflare Pages custom 404 handler to serve `index.html`.

### 3. Security Headers via `_headers` File
Place a `_headers` file in `web/public/_headers` (or build output `dist/_headers`) to enforce security headers across all edge responses:
```
/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-src 'self';
```

### 4. Environment Variables
In the Cloudflare Pages project settings, set:
- `VITE_API_BASE_URL`: `https://api.yourdomain.com/api/v1`

---

## Option B: Cloudflare R2 + Workers (Custom Object Storage Bucket)

If hosting the static build artifacts inside a private Cloudflare R2 bucket:

### 1. Upload Artifacts with Wrangler or AWS S3 Compatible CLI
```bash
# Upload dist contents to R2 bucket
npx wrangler r2 object put resumeee-web-assets/index.html --file=dist/index.html --content-type="text/html"
# Sync assets directory
aws s3 sync dist/ s3://resumeee-web-assets/ \
  --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

### 2. Worker SPA Fallback Route with Security Headers (`worker.ts`)
```typescript
function applySecurityHeaders(headers: Headers): void {
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self';"
  );
}

export default {
  async fetch(request: Request, env: { R2_BUCKET: R2Bucket }): Promise<Response> {
    const url = new URL(request.url);
    const key = url.pathname.slice(1);

    // Attempt to retrieve exact object
    if (key.length > 0) {
      const object = await env.R2_BUCKET.get(key);
      if (object) {
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        applySecurityHeaders(headers);
        if (key.startsWith("assets/")) {
          headers.set("Cache-Control", "public, max-age=31536000, immutable");
        }
        return new Response(object.body, { headers });
      }
    }

    // SPA Fallback: serve index.html for all non-asset requests
    const indexObject = await env.R2_BUCKET.get("index.html");
    if (!indexObject) {
      return new Response("Application not found", { status: 404 });
    }

    const headers = new Headers();
    indexObject.writeHttpMetadata(headers);
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    applySecurityHeaders(headers);
    return new Response(indexObject.body, { headers });
  },
};
```
