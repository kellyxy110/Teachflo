"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function setupSchool(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await currentUser();
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

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
