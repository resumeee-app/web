# Deploying Resumeee SPA to AWS S3 + CloudFront

AWS S3 serves as the durable object storage layer, while Amazon CloudFront provides edge caching, HTTPS termination, and the crucial SPA routing fallback.

---

## 1. Architecture Overview

```
[Browser] 
   │
   ▼
[Amazon CloudFront]
   ├── Path: /assets/*  ──> S3 Bucket (Cache: 1 Year)
   ├── Path: /api/v1/*  ──> Backend Origin (EC2, ECS, or ALB)
   └── Path: /*         ──> S3 Bucket (Custom Error 404/403 -> /index.html 200)
```

---

## 2. Step-by-Step Setup

### Step 1: Create S3 Storage Bucket
Create an S3 bucket with Block Public Access enabled (access is granted exclusively to CloudFront via Origin Access Control - OAC):
```bash
aws s3 mb s3://resumeee-web-spa --region us-east-1
```

### Step 2: Configure Origin Access Control (OAC)
Grant CloudFront read access to the S3 bucket using an S3 Bucket Policy:
```json
{
  "Version": "2012-10-17",
  "Statement": {
    "Sid": "AllowCloudFrontServicePrincipalReadOnly",
    "Effect": "Allow",
    "Principal": {
      "Service": "cloudfront.amazonaws.com"
    },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::resumeee-web-spa/*",
    "Condition": {
      "StringEquals": {
        "AWS:SourceArn": "arn:aws:cloudfront::<ACCOUNT_ID>:distribution/<DISTRIBUTION_ID>"
      }
    }
  }
}
```

### Step 3: Configure CloudFront Custom Error Response (SPA Invariant)
To support client-side routing in React Router without 404/403 errors:
1. In CloudFront Distribution -> **Error pages** -> **Create custom error response**.
2. **HTTP error code**: `403: Forbidden`
   - **Customize error response**: Yes
   - **Response page path**: `/index.html`
   - **HTTP response code**: `200: OK`
3. Repeat for **HTTP error code**: `404: Not Found`
   - **Response page path**: `/index.html`
   - **HTTP response code**: `200: OK`

### Step 4: Cache Behaviors & Response Headers Policy
- **Default (`*`)**:
  - Viewer Protocol Policy: Redirect HTTP to HTTPS
  - Cache Policy: `Managed-CachingDisabled` or Custom Policy with `max-age=0, must-revalidate` for `index.html`.
  - **Response Headers Policy**: Attach a CloudFront Response Headers Policy enforcing:
    - `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload`
    - `X-Content-Type-Options`: `nosniff`
    - `X-Frame-Options`: `SAMEORIGIN`
    - `Referrer-Policy`: `strict-origin-when-cross-origin`
    - `Permissions-Policy`: `camera=(), microphone=(), geolocation=()`
    - `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self';`
- **Precedence 0 (`/assets/*`)**:
  - Cache Policy: `Managed-CachingOptimized` (`Cache-Control: public, max-age=31536000, immutable`).
  - Response Headers Policy: Attach same security headers policy.

---

## 3. Deployment Script

```bash
#!/usr/bin/env bash
set -euo pipefail

BUCKET_NAME="resumeee-web-spa"
DISTRIBUTION_ID="<YOUR_CLOUDFRONT_DISTRIBUTION_ID>"

# 1. Build the production bundle
npm run build

# 2. Sync hashed assets with long cache duration
aws s3 sync dist/assets/ s3://${BUCKET_NAME}/assets/ \
  --cache-control "public, max-age=31536000, immutable" \
  --delete

# 3. Sync remaining files (index.html, robots.txt, etc.) with no-cache
aws s3 sync dist/ s3://${BUCKET_NAME}/ \
  --exclude "assets/*" \
  --cache-control "public, max-age=0, must-revalidate" \
  --delete

# 4. Invalidate CloudFront cache for index.html
aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/index.html" "/"
```
