# OpenAPI contract snapshot

`openapi.yaml` is a copy of the authoritative REST contract owned by `resumeee-app/server`.
It was synced from `resumeee-app/server@858d060` (`openapi/openapi.yaml`).

`npm run generate:api` regenerates `src/api/schema.d.ts` from this file.

Until the automated contract pipeline from RFC-006 Phase 3 exists (CI fetches the spec from a
`server` release and fails on schema drift), copy `openapi/openapi.yaml` from `server`
whenever the API contract changes, then run `npm run generate:api` and commit both files together.
