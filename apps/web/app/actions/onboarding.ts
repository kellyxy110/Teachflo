"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { safeAuth, safeCurrentUser } from "@/lib/auth";
import { authService } from "@/lib/auth/service";

export async function setupSchool(formData: FormData) {
  const { userId } = await safeAuth();
  if (!userId) throw new Error("Unauthorized");

  const user = await safeCurrentUser();
  if (!user) throw new Error("No user found");

  const schoolName = formData.get("schoolName") as string;
  const state = formData.get("state") as string;
  const lga = formData.get("lga") as string;

  if (!schoolName || !state) throw new Error("School name and state required");

  const existing = await db.teacher.findUnique({ where: { clerkId: userId } });
  if (existing) redirect("/dashboard");

  const code = schoolName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 6);

  // Create school, teacher and provider identity atomically. A failed identity
  // insert must not leave an orphaned school or an unusable teacher record.
  const school = await db.$transaction(async (tx) => {
    const existingIdentity = await tx.authIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: process.env.AUTH_PROVIDER === "supabase" ? "SUPABASE" : "CLERK",
          providerUserId: userId,
        },
      },
    });
    if (existingIdentity) throw new Error("This account is already linked to a school or student.");

    const createdSchool = await tx.school.create({
      data: {
        name: schoolName,
        code: `${code}-${Date.now().toString(36).toUpperCase()}`,
        state,
        lga: lga || undefined,
      },
    });
    const teacher = await tx.teacher.create({
      data: {
        clerkId: userId,
        schoolId: createdSchool.id,
        firstName: user.firstName ?? "Teacher",
        lastName: user.lastName ?? "",
        email: user.email ?? "",
        role: "ADMIN",
      },
    });
    await tx.authIdentity.create({
      data: {
        provider: process.env.AUTH_PROVIDER === "supabase" ? "SUPABASE" : "CLERK",
        providerUserId: userId,
        teacherId: teacher.id,
      },
    });
    return createdSchool;
  });

  // Stamp role + schoolId onto the user so middleware can read it
  // from the JWT without a DB round-trip on every request.
  try {
    await authService.setUserMetadata(userId, { role: "school_admin", schoolId: school.id });
  } catch {
    // Non-fatal — app works without metadata, just no RBAC in middleware
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
