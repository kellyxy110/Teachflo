# Repository Evaluation: Logto

**Repository:** https://github.com/logto-io/logto  
**Category:** Authentication & Identity Platform (OIDC/OAuth2)  
**TeachNexis Service Target:** TeachNexis Identity Service  
**Priority:** Phase 1 — Strategic Assessment  
**Evaluated:** 2026-07-04  

---

## What It Does

Logto is a self-hostable, open-source identity and access management platform built on OIDC/OAuth2. It provides:

- **OIDC-compliant authorization server** — issues JWTs, manages sessions, handles token refresh
- **Multi-tenant organization support** — each school can be an "organization" with its own user pool and role assignments
- **RBAC** — define roles and permissions at the application level; roles are embedded in JWT claims
- **Social login connectors** — Google, GitHub, Facebook, Microsoft, Apple (and custom connectors)
- **MFA** — TOTP (Authenticator apps), SMS OTP, Email OTP, WebAuthn
- **Management API** — full REST API for programmatic user/org/role management
- **SDKs** — Next.js, React, Vue, Node.js, Python, iOS, Android

Backed by a dedicated company (Silverhand Inc.), with a cloud-managed tier (Logto Cloud) and a fully self-hostable open-source version under MIT license.

---

## Tech Stack

- **Language:** TypeScript (both frontend admin UI and backend)
- **Database:** PostgreSQL
- **Cache:** Redis (optional, recommended for production)
- **Deployment:** Docker Compose, Kubernetes, Railway, cloud VMs
- **License:** MIT (core) — open-source with no commercial restrictions on self-hosted use

---

## License

**MPL-2.0 (Mozilla Public License 2.0)** — file-level copyleft, not AGPL. Using Logto unmodified as an identity service creates no copyleft obligation on TeachNexis code. If you modify Logto source files themselves, those files must be open-sourced under MPL-2.0. For a product company using Logto as infrastructure (not forking it), this is a non-issue. Self-hosting is unlimited and unrestricted.

---

## Production Readiness

- **GitHub stars:** ~13,700+
- **Maintainer:** Silverhand Inc. — dedicated team, active development
- **Maturity:** Production-grade. OpenID-certified OIDC/OAuth 2.1 identity server. Used by startups and mid-sized companies.
- **Admin UI:** Polished, full-featured management console
- **SDK quality:** Next.js SDK is solid; App Router support is complete. **Gap:** Next.js integration is less mature than Clerk — redirect-flow auth adds latency that Clerk's embedded components avoid.
- **Known gaps for Nigeria:**
  - No WhatsApp OTP or Termii SMS connector out of the box (require custom connector build)
  - No Lagos/Africa cloud region — nearest is West US (latency impact for self-hosted Logto Cloud)
  - No Paystack/Flutterwave payment integration (billing handled separately)

---

## TeachNexis Use Cases

| Use Case | Logto Capability |
|---|---|
| Teacher login (email + password / Google) | ✅ Native |
| Student login (school-issued code + PIN) | ⚠️ Requires custom connector build |
| Parent login (phone OTP) | ⚠️ SMS connector available but no Termii/WhatsApp native connector |
| School admin login with MFA | ✅ TOTP + WebAuthn |
| Multi-school tenancy (each school = org) | ✅ Organization Template — define Principal/HOD/Teacher/Student/Parent once, every school inherits |
| RBAC (Teacher/HOD/Principal/Student) | ✅ Roles + permission scopes in JWT claims |
| Bulk teacher onboarding | ✅ JIT provisioning via SSO |
| SSO for government schools | ✅ SAML/OIDC SSO connectors |
| Custom student PIN flow | ⚠️ Custom connector or API-only auth — 2-3 weeks build |

---

## Logto vs Clerk — Direct Comparison

| Dimension | Clerk (current) | Logto |
|---|---|---|
| **Multi-tenancy** | Organizations (paid tier) | Organizations (free on OSS) |
| **RBAC** | Roles in metadata (manual) | Native RBAC with permission scopes |
| **Student PIN login** | Not supported natively | Custom connector possible |
| **Nigeria SMS OTP** | Twilio (via Clerk) | Africa's Talking, Termii connectors |
| **Self-hosted** | No — Clerk is cloud-only | Yes — full self-hosting |
| **Data sovereignty** | Data on Clerk's servers | Data on your own Postgres |
| **Free tier limits** | 10,000 MAU | Unlimited (self-hosted OSS) |
| **Next.js App Router** | Excellent — first-class | Good — improving rapidly |
| **Webhook events** | Comprehensive | Good coverage |
| **Admin UI** | Very polished | Polished, slightly behind Clerk |
| **Enterprise SSO** | Available (paid) | Available (self-hosted) |
| **Migration cost** | — | High (JWT issuer change) |
| **Operational overhead** | Zero (cloud) | Medium (self-hosted Postgres + Redis) |

**Clerk wins on:** DX, Next.js integration maturity, zero operational overhead  
**Logto wins on:** data sovereignty, unlimited MAU on OSS, RBAC native implementation, student PIN potential, no vendor lock-in

---

## What TeachNexis Can Learn From Logto's Architecture

1. **Organization-scoped RBAC:** Logto's model of `Organization → Members → Roles → Permissions` is exactly the right mental model for multi-school TeachNexis. Each school is an organization. A teacher at School A has no role at School B.

2. **Permission scope design:** Logto embeds permission scopes directly in the JWT access token. Middleware can check `token.scopes.includes("exam:create")` without a database roundtrip. TeachNexis should implement this pattern even while on Clerk (store permissions in Clerk's `publicMetadata`).

3. **Management API pattern:** Logto's full REST Management API for user/org/role CRUD is the right pattern for TeachNexis's school admin console. When a principal wants to deactivate a teacher, it should call an Identity Service method, not a direct database update.

4. **Custom connector model:** Logto's connector system (each social/SMS provider is a plugin) is the right abstraction for TeachNexis's Nigerian SMS providers. This should inform how TeachNexis Notification Service handles auth-related OTPs.

---

## What to Avoid

- **Do not migrate from Clerk to Logto now.** The migration cost (JWT issuer change, all Clerk SDK imports replaced, user database migration, webhook re-registration) is 2-4 weeks of engineering time with high breakage risk. TeachNexis is in active feature development.
- **Do not self-host Logto without dedicated ops.** Self-hosting means managing PostgreSQL, Redis, SSL certificates, updates, and backups for your identity layer. A failed identity service = zero users can log in. Requires 99.9% uptime discipline.
- **Do not assume Logto handles student PIN login out of the box.** It does not. A custom authentication connector requires implementing a specific Logto connector interface — non-trivial work.

---

## Integration Risks (if migrating)

| Risk | Severity | Notes |
|---|---|---|
| JWT issuer change breaks all existing sessions | Critical | Requires coordinated migration window |
| Clerk SDK imports scattered across codebase | High | Currently mitigated by our `lib/auth` adapter |
| User DB migration (Clerk IDs → Logto IDs) | High | Foreign keys in Teacher/Student tables reference Clerk IDs |
| Webhook endpoint re-registration | Medium | CLERK_WEBHOOK_SECRET replaced with Logto equivalent |
| Clerk publicMetadata → Logto custom claims | Medium | Role/schoolId stored in different shape |
| Student PIN flow requires custom connector build | High | Not native — 2-3 weeks of connector development |

---

## Security Analysis

**Logto strengths:**
- OIDC-compliant — standard, audited protocol
- JWT signing with RS256 (asymmetric) by default
- PKCE enforced for all public clients
- Token rotation on refresh
- Brute force protection on login endpoints

**Gaps for TeachNexis to monitor:**
- Self-hosted deployment requires keeping Logto updated for security patches
- Redis cache for sessions — if Redis is compromised, all sessions are compromised
- Custom connectors (student PIN) require security review — not covered by Logto's security audit

---

## Recommended Approach: TeachNexis Identity Service

The `TeachNexisIdentityService` interface (see `docs/service-interfaces/identity-service.md`) is already designed to be provider-agnostic. This means:

**Today:** Clerk adapter powers the interface. No Clerk code outside `lib/auth/adapters/clerk.ts`.  
**Future:** Logto adapter replaces the Clerk adapter. Zero changes to feature code.

The migration becomes a one-file swap — because the interface was designed correctly from the start.

**Do now, regardless of migration plan:** Apply Logto's org-scoped JWT patterns within Clerk immediately:
- `schoolId` claim enforced in API middleware (not just read from DB on every request)
- Role taxonomy as a typed enum in `publicMetadata` (matches what Logto would put in JWT claims)
- 3–5 days of adapter work now cuts future migration cost nearly in half

---

## Build vs Wrap vs Study

**Recommendation: STUDY NOW → PLAN MIGRATION for Phase 3**

| Phase | Action |
|---|---|
| Phase 1-2 | Stay on Clerk. Formalize `TeachNexisIdentityService` interface. Ensure Clerk is only accessed through the adapter. Apply Logto's org-scoped JWT patterns in Clerk now. |
| Phase 2 | Build student PIN login as a TeachNexis-native JWT system (bypasses both Clerk and Logto — the Identity Service interface supports this natively). |
| Phase 3 | Migrate to Logto when **any of these triggers hit:** MAU exceeds 40,000; NITDA/NDPR creates a data residency requirement that Clerk cannot satisfy; Clerk's organization model becomes structurally insufficient for multi-school tenancy needs. Budget 3–4 weeks. Run shadow mode during migration. |
| Phase 4 | Migrate user accounts school by school. Cut over middleware adapter. Decommission Clerk. |

**What NOT to do:** Never build a custom identity server from scratch. The rebuild cost (16–20 weeks for a secure OIDC server with JWT signing, refresh token rotation, MFA, social connectors) exceeds the entire remaining MVP build. Either Clerk or Logto — not neither.

---

## Student PIN Login — Native Implementation (Recommended)

Rather than building a Logto custom connector for student PIN login, implement it natively in TeachNexis:

```typescript
// Completely outside Clerk and Logto
// lib/auth/student-auth.ts

async function authenticateStudent(
  studentCode: string,
  pin: string,
  schoolCode: string
): Promise<string> { // returns signed JWT
  const school = await db.school.findUnique({ where: { code: schoolCode } });
  if (!school) throw new AuthError("School not found");

  const student = await db.student.findUnique({
    where: { code_schoolId: { code: studentCode, schoolId: school.id } },
    select: { id: true, pinHash: true, schoolId: true, classId: true },
  });
  if (!student) throw new AuthError("Invalid credentials");

  const valid = await bcrypt.compare(pin, student.pinHash);
  if (!valid) throw new AuthError("Invalid credentials");

  return signStudentJWT({
    studentId: student.id,
    schoolId: student.schoolId,
    role: "STUDENT",
    expiresIn: "24h",
  });
}
```

This native student auth issues TeachNexis JWTs verified by middleware — independent of Clerk or Logto. It can be built in 3-4 days and works today.

---

## Replacement Strategy

1. **Now:** Formalize `TeachNexisIdentityService` interface. All Clerk access through adapter.
2. **Month 2:** Build native student PIN JWT auth as part of Identity Service.
3. **Month 3:** Build Logto adapter in parallel (non-production). Verify it passes the same interface contract as the Clerk adapter.
4. **Month 6+:** When migration makes economic or strategic sense, switch adapters. Zero feature code changes.

---

## Final Verdict

**Stay on Clerk now. Build the `TeachNexisIdentityService` adapter this week. Apply Logto's org-scoped JWT patterns in Clerk immediately. Migrate to self-hosted Logto when MAU exceeds 40,000 or NDPR data residency becomes a compliance requirement.**

Logto is architecturally superior to Clerk for multi-school tenancy, RBAC depth, and data sovereignty — and its MPL-2.0 license creates no commercial obligation for a company using it unmodified. But Clerk's Next.js DX advantage is real, its zero-infrastructure overhead is a genuine team productivity asset, and migration during active feature development costs 3–4 weeks of high-risk engineering time. The right move is to formalize the `TeachNexisIdentityService` adapter today — 3–5 days of work that cuts the future migration cost by half and makes the eventual switch a one-file swap. Never build a custom identity server from scratch; the 16–20 week rebuild cost far exceeds any benefit.
