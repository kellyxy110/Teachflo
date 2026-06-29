# Data: [Capability Name]

## Tables

### [TableName]
**Purpose:** What this table stores and why.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | String (cuid) | No | auto | Primary key |
| schoolId | String | No | — | Multi-tenant isolation key |
| [column] | [type] | Yes/No | [default] | [notes] |
| createdAt | DateTime | No | now() | |
| updatedAt | DateTime | No | auto | |

**Indexes:**
- Primary: `id`
- Unique: `[field combination]`
- Lookup: `schoolId` (all tenant queries)
- [Additional indexes]

**Relations:**
- Belongs to: [Table] via [foreignKey]
- Has many: [Table] via [foreignKey]

---

## Schema (Prisma)

```prisma
model [TableName] {
  id        String   @id @default(cuid())
  schoolId  String
  // [other fields]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  school    School   @relation(fields: [schoolId], references: [id])

  @@index([schoolId])
}
```

---

## Migration Notes

SQL to run in Supabase SQL Editor (do NOT use `prisma db push` — IPv6 restriction):

```sql
-- [Migration SQL here]
-- Always test in a transaction:
BEGIN;
-- [SQL statements]
COMMIT;
```

---

## Data Constraints

| Constraint | Field | Rule |
|---|---|---|
| Tenant isolation | All queries | Must include `WHERE schoolId = :schoolId` |
| [Other constraint] | [Field] | [Rule] |

## Caching Strategy

| Data | Cache Key | TTL | Invalidation Trigger |
|---|---|---|---|
| [Data type] | [Key pattern] | [Duration] | [What invalidates it] |

## Storage Considerations

- Expected row volume: [estimate]
- Growth rate: [estimate]
- Archival strategy: [if applicable]
- JSON columns: [list any JSON columns and their growth caps]
