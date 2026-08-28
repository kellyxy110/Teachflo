# F1.1 browser verification

The Playwright suite is Development-locked by `TEACHNEXIS_E2E_PROJECT_REF` and
does not provide an HTTP authentication bypass. It uses a local, git-ignored
Clerk session at `apps/web/.auth/teacher.json` when present.

The single owner action needed for authenticated verification is:

1. Start the local TeachNexis web app with legitimate Development Clerk values.
2. Run `$env:TEACHNEXIS_E2E_BASE_URL='http://127.0.0.1:3000'; $env:TEACHNEXIS_E2E_PROJECT_REF='wxgnufdacfncwxbedzap'; pnpm --filter @teachflow/web run test:f1-auth-state`.
3. Sign in as a Development Teacher in the opened browser and press Enter in
   the terminal; the script saves `apps/web/.auth/teacher.json`.

No header, query parameter, cookie, request body flag, or production environment
variable enables test authentication. The existing in-process auth seam cannot
be used by browser HTTP requests.
