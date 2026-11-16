# OpenAPI contract snapshot

`openapi.yaml` is a copy of the authoritative REST contract owned by `server`.
It was taken from `rrivera/resumeee@796a431` (`api/openapi.yaml`) when this repository was extracted.

`npm run generate:api` regenerates `src/api/schema.d.ts` from this file.

Until the automated contract pipeline from RFC-006 Phase 3 exists (CI fetches the spec from a
`server` release and fails on schema drift), update this file by hand whenever the API
contract changes, then run `npm run generate:api` and commit both files together.
