# Deploying Resumeee SPA to Google Cloud Storage (GCS) + Cloud CDN

Google Cloud Storage (GCS) provides native static website hosting features that allow setting both the main page suffix and the 404 not-found fallback to `index.html`.

---

## 1. Setup Storage Bucket (Secure, Non-Public Access)

```bash
# 1. Create a regional or multi-regional GCS bucket with uniform bucket-level access
gcloud storage buckets create gs://resumeee-web-spa --location=us-central1 --uniform-bucket-level-access

# 2. Configure bucket website configuration for SPA routing
# Setting NotFoundPage to index.html guarantees client-side routes load index.html
gcloud storage buckets update gs://resumeee-web-spa \
  --web-main-page-suffix=index.html \
  --web-error-page=index.html

# 3. Secure Origin Access: Grant read permissions strictly to the Cloud CDN service account
# Never expose the bucket via public 'allUsers' bindings
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
gcloud storage buckets add-iam-policy-binding gs://resumeee-web-spa \
  --member="serviceAccount:service-${PROJECT_NUMBER}@cloud-cdn-fill.iam.gserviceaccount.com" \
  --role=roles/storage.objectViewer
```

---

## 2. Connect Cloud CDN & HTTPS Load Balancer with Security Headers

1. Create a backend bucket pointing to `gs://resumeee-web-spa` with Cloud CDN enabled.
2. In the URL Map, configure:
   - Default service: `backend-bucket-spa`
   - Path matcher for `/api/v1/*`: Forward to Go server backend service (`resumeee-server-service`).
3. Configure Custom Response Headers on the HTTPS Load Balancer:
   - `X-Content-Type-Options`: `nosniff`
   - `X-Frame-Options`: `SAMEORIGIN`
   - `Referrer-Policy`: `strict-origin-when-cross-origin`
   - `Permissions-Policy`: `camera=(), microphone=(), geolocation=()`
   - `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-src 'self';`
4. Attach Google-managed SSL Certificate and Global Forwarding Rule for port 443.

---

## 3. Deployment Script

```bash
#!/usr/bin/env bash
set -euo pipefail

BUCKET="gs://resumeee-web-spa"

# Build production SPA bundle
npm run build

# Upload hashed static assets with immutable cache
gcloud storage rsync dist/assets/ ${BUCKET}/assets/ \
  --metadata="cache-control=public,max-age=31536000,immutable" \
  --delete-unmatched-destination-objects

# Upload index.html and root files with zero-cache revalidation
gcloud storage cp dist/index.html ${BUCKET}/index.html \
  --metadata="cache-control=public,max-age=0,must-revalidate"
```
