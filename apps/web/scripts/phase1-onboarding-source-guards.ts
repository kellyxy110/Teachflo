import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const school = source("app/actions/onboarding.ts");
const student = source("app/api/student/claim/route.ts");
const redirect = source("app/auth-redirect/page.tsx");

assert.match(school, /db\.\$transaction\(async \(tx\)/, "school onboarding must be atomic");
assert.match(school, /tx\.school\.create\(/);
assert.match(school, /tx\.teacher\.create\(/);
assert.match(school, /tx\.authIdentity\.create\(/);
assert.doesNotMatch(school, /await db\.school\.create\(/);
assert.match(student, /db\.\$transaction\(async \(tx\)/, "student claim must be atomic");
assert.match(student, /tx\.student\.updateMany\(/);
assert.match(student, /clerkId: null, isActive: true/);
assert.match(student, /claimed\.count !== 1/);
assert.match(student, /tx\.authIdentity\.create\(/);
assert.match(student, /try \{ body = await request\.json\(\)/);
assert.match(redirect, /getCurrentTeacher\(\)/);
assert.match(redirect, /getCurrentStudent\(\)/);
assert.match(redirect, /redirect\("\/s\/dashboard"\)/);
console.log("Phase 1 onboarding source guards passed. Runtime and browser tests remain required.");
