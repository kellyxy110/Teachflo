# Contract: Classroom Management Domain

## Purpose
Own all day-to-day operational data for teachers — attendance records, student health information, and clinic visit history — scoped strictly to the authenticated school.

## Responsibilities

**Owns:**
- Daily attendance recording and status tracking (Present, Late, Absent, Excused)
- Chronic absenteeism detection (>20% absence rate in a recorded month)
- Student health record storage (blood group, genotype, allergies, conditions, medications, emergency contacts)
- Clinic visit log per student

**Does NOT own:**
- Student enrolment or class assignment (School Administration domain)
- Assessment data or scores (Assessment & Learning Intelligence domain)
- AI-generated content (AI Infrastructure domain)
- Curriculum structure (Curriculum Intelligence domain)

## Inputs

### saveAttendance
| Field | Type | Required | Validation |
|---|---|---|---|
| classId | string | yes | Must belong to authenticated schoolId |
| date | string | yes | `/^\d{4}-\d{2}-\d{2}$/` |
| records | Array<{studentId, status, note?}> | yes | 1–500 records; studentIds validated against schoolId; status in VALID_STATUSES; note ≤500 chars |

### saveHealthRecord
| Field | Type | Required | Validation |
|---|---|---|---|
| studentId | string | yes | Must belong to authenticated schoolId |
| formData | FormData | yes | bloodGroup, genotype optional strings; array fields trimmed and filtered |

### addClinicVisit
| Field | Type | Required | Validation |
|---|---|---|---|
| studentId | string | yes | Must belong to authenticated schoolId |
| visitDate | string | yes | ISO date string |
| reason | string | yes | Trimmed |
| treatment | string | no | Trimmed |
| notes | string | no | Trimmed |

## Outputs

### getAttendanceForDate
| Field | Type | Guarantee |
|---|---|---|
| map | Record<studentId, {id, status, note}> | All records belong to authenticated school |

### getAttendanceStats
| Field | Type | Guarantee |
|---|---|---|
| studentCount | number | Always present |
| daysRecorded | number | Always present |
| totalPresent/Absent/Late/Excused | number | Always present |
| studentStats | Record<studentId, stats> | Only includes students in the authenticated school's class |

### getHealthRecord
| Field | Type | Guarantee |
|---|---|---|
| student | Student object | Always present or throws "not found" |
| record | HealthRecord or null | null if no record exists yet |

## Dependencies
- Platform: Authentication & Authorisation (requireSchool)
- Platform: Data Isolation (schoolId scoping)
- Database domain: Student, Attendance, HealthRecord tables

## Events Produced

| Event | Payload | Trigger |
|---|---|---|
| `attendance.saved` | `{ classId, date, schoolId, recordCount }` | After successful attendance upsert |
| `student.flagged.absent` | `{ studentId, schoolId, absenceRate, month }` | When chronic absenteeism threshold exceeded |
| `health.record.updated` | `{ studentId, schoolId, updatedBy }` | After health record upsert |

## Events Consumed
None currently. Future: may consume `student.enrolled` to pre-populate attendance lists.

## Quality Guarantees
- Every attendance and health record returned belongs to the authenticated school — guaranteed by schoolId filter at query level.
- Student IDs in bulk attendance saves are validated against schoolId before any write occurs.
- Clinic visit history will never exceed 200 entries per student.
- Notes fields are capped at 500 characters.
- Chronic absenteeism flag is calculated on every save — not batched or deferred.

## Failure Behaviour
- Invalid classId or studentId (not belonging to school): throws "Class not found" / "Student not found". Does not reveal whether resource exists in another school.
- Invalid date format: throws "Invalid date format".
- Invalid status value: throws "Invalid attendance status".
- Partial failure in bulk upsert: entire transaction rolls back.

## Extension Points
- `attendance.saved` event may be consumed by a future Parent Notification module.
- `student.flagged.absent` event may be consumed by a future School Administration dashboard.
- Health records may be extended with immunisation tracking without changing the core contract.
