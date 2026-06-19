"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { safeAuth, safeCurrentUser } from "@/lib/auth";

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

  const school = await db.school.create({
    data: {
      name: schoolName,
      code: `${code}-${Date.now().toString(36).toUpperCase()}`,
      state,
      lga: lga || undefined,
    },
  });

  await db.teacher.create({
    data: {
      clerkId: userId,
      schoolId: school.id,
      firstName: user.firstName ?? "Teacher",
      lastName: user.lastName ?? "",
      email: user.emailAddresses[0]?.emailAddress ?? "",
      role: "ADMIN",
    },
  });

  // Stamp role + schoolId onto the Clerk user so middleware can read it
  // from the JWT without a DB round-trip on every request.
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: { role: "school_admin", schoolId: school.id },
    });
  } catch {
    // Non-fatal — app works without metadata, just no RBAC in middleware
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
