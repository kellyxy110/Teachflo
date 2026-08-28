# TeachNexis Curriculum Capability Map (F9A)

| Capability | Status | Current evidence / boundary |
|---|---|---|
| Curriculum registry | PARTIAL | `CurriculumNode` exists, but no authority/version registry. |
| Curriculum versions | CONTRACT_ONLY | `CurriculumNode.version` is not a release history. |
| Education levels | PARTIAL | `ClassLevel` supports JS1–SS3 only. |
| Operational classes | EXISTS | `Class` is school/session/term scoped and must not be duplicated. |
| Subjects | PARTIAL | Strings plus school `SubjectAlias`; no global canonical subject entity. |
| Terms/periods | PARTIAL | Operational `Term` exists; curriculum-period identity is absent. |
| Topics | PARTIAL | Graph TOPIC nodes exist; Exam/Lesson/Question also use free text. |
| Subtopics | CONTRACT_ONLY | Free-text tags only; future nested nodes are required. |
| Learning objectives | PARTIAL | Typed graph nodes exist without first-class versioned alignment joins. |
| Prerequisites | PARTIAL | `REQUIRES` edges and bounded traversal exist; population/review is limited. |
| Related concepts | PARTIAL | `RELATED_TO`/other edges exist; semantics need governance. |
| Curriculum provenance | CONTRACT_ONLY | No structured source/reviewer record. |
| Question alignment | CONTRACT_ONLY | Legacy free-text fields; no authoritative QuestionVersion join. |
| QuestionVersion alignment | CONTRACT_ONLY | Required for historical correctness, not implemented. |
| Exam alignment | CONTRACT_ONLY | `examStandards[]` and prompt tags are not verified syllabus mappings. |
| Lesson alignment | CONTRACT_ONLY | Lesson topic/objectives are text, not stable graph references. |
| Scheme of Work | PARTIAL | `CurriculumPlan` JSON is a school planning artifact, not node placements. |
| Curriculum coverage | CONTRACT_ONLY | Inputs exist, deterministic scoped formulas are not implemented. |
| Question Bank curriculum filters | CONTRACT_ONLY | Current F5 search/filter contract is not graph-backed. |
| Curriculum Explorer | PARTIAL | CIG routes/actions/services support bounded topic/context reads. |
| AI grounding | PARTIAL | CIG context is injected into prompts, but source/version approval is absent. |
| Student evidence | PARTIAL | Attempts/responses exist; objective-level evidence join is absent. |
| Mastery | DEFERRED | Adaptive/intelligence code is not authoritative mastery. |
| Multi-curriculum | CONTRACT_ONLY | Current tags can mention boards; no versioned multi-framework registry. |
| Import pipeline | CONTRACT_ONLY | Seed/SQL/import artifacts exist; controlled extract-review-publish governance is missing. |
| Import idempotency | PARTIAL | Graph edge uniqueness exists; stable source identity is absent. |
| Search | PARTIAL | PostgreSQL bounded text/array search exists in graph service. |
| Facets/filtering | CONTRACT_ONLY | Subject/class/term filters exist; curriculum/objective facets do not. |
| Duplicate intelligence | DEFERRED | No semantic duplicate engine in F9A. |
| Quality intelligence | DEFERRED | No authoritative quality score. |
| Privileged curriculum administration | CONTRACT_ONLY | Global nodes are read-only; reviewer/publisher role is undefined. |
| Mobile curriculum navigation | CONTRACT_ONLY | Progressive drill-down/filter contract only. |
| Accessibility contract | CONTRACT_ONLY | Requirements defined; no F9 UI implementation. |

## Recommended phase sequence

1. **F9B — Additive curriculum registry and alignment schema**: introduce versioned registry, provenance, stable external keys, and QuestionVersion alignment without seeding content.
2. **F9C — Controlled ingestion and review**: quarantine, normalize, match, human review, approve, publish, and idempotent backfill of only evidenced sources.
3. **F9D — Curriculum Explorer**: progressive teacher navigation and bounded server queries.
4. **F9E — Question Bank curriculum integration**: reviewed metadata, server pagination, filters, and alignment-aware previews.
5. **F9F — Lesson/Scheme-of-Work alignment**: additive joins and school sequencing.
6. **F9G — Evidence and coverage**: objective-level descriptive evidence and coverage, explicitly before mastery.
