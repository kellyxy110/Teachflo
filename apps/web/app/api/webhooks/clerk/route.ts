import { headers } from "next/headers";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return Response.json({ error: "CLERK_WEBHOOK_SECRET is not set" }, { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return Response.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await request.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;
  try {
    evt = wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = evt;

  switch (type) {
    case "user.deleted": {
      const clerkId = (data as { id?: string }).id;
      if (!clerkId) break;
      await db.teacher.updateMany({
        where: { clerkId },
        data: { isActive: false },
      });
      break;
    }

    case "user.updated": {
      const d = data as {
        id: string;
        email_addresses: Array<{ email_address: string }>;
        first_name?: string | null;
        last_name?: string | null;
      };
      if (!d.id) break;
      const primaryEmail = d.email_addresses?.[0]?.email_address;
      await db.teacher.updateMany({
        where: { clerkId: d.id },
        data: {
          ...(primaryEmail && { email: primaryEmail }),
          ...(d.first_name && { firstName: d.first_name }),
          ...(d.last_name !== undefined && { lastName: d.last_name ?? "" }),
        },
      });
      break;
    }

    case "user.created":
      // Handled by the onboarding flow — no action needed here.
      break;

    default:
      break;
  }

  return Response.json({ received: true });
}
