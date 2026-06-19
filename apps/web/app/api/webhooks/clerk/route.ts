/**
 * Clerk webhook receiver — syncs Clerk user events to the TeachFlow DB.
 *
 * Setup (production):
 * 1. Clerk Dashboard → Webhooks → Add endpoint → https://yourdomain.com/api/webhooks/clerk
 * 2. Select events: user.created, user.updated, user.deleted
 * 3. Copy the Signing Secret and add CLERK_WEBHOOK_SECRET to Vercel env vars.
 * 4. Install svix: pnpm add svix
 *
 * The webhook deactivates teachers whose Clerk accounts are deleted and keeps
 * publicMetadata in sync with the DB role if you ever update it server-side.
 */

import { headers } from "next/headers";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return Response.json(
      { error: "CLERK_WEBHOOK_SECRET is not set" },
      { status: 500 }
    );
  }

  // Verify the webhook signature using svix
  // Uncomment after: pnpm add svix
  //
  // import { Webhook } from "svix";
  // const headerPayload = await headers();
  // const svix_id = headerPayload.get("svix-id");
  // const svix_timestamp = headerPayload.get("svix-timestamp");
  // const svix_signature = headerPayload.get("svix-signature");
  // if (!svix_id || !svix_timestamp || !svix_signature) {
  //   return Response.json({ error: "Missing svix headers" }, { status: 400 });
  // }
  // const payload = await request.text();
  // const wh = new Webhook(WEBHOOK_SECRET);
  // let evt: WebhookEvent;
  // try {
  //   evt = wh.verify(payload, { "svix-id": svix_id, "svix-timestamp": svix_timestamp, "svix-signature": svix_signature }) as WebhookEvent;
  // } catch {
  //   return Response.json({ error: "Invalid signature" }, { status: 400 });
  // }

  // ── Temporary: parse without verification (dev only) ──────────────────────
  // Remove this block and uncomment the svix section above before going to production.
  let evt: { type: string; data: Record<string, unknown> };
  try {
    evt = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  // ── End temporary block ───────────────────────────────────────────────────

  const { type, data } = evt;

  switch (type) {
    case "user.deleted": {
      const clerkId = data.id as string;
      if (!clerkId) break;
      // Soft-delete: deactivate teacher record rather than hard delete
      await db.teacher.updateMany({
        where: { clerkId },
        data: { isActive: false },
      });
      break;
    }

    case "user.updated": {
      const clerkId = data.id as string;
      const emailAddresses = data.email_addresses as Array<{ email_address: string }>;
      const primaryEmail = emailAddresses?.[0]?.email_address;
      const firstName = data.first_name as string | null;
      const lastName = data.last_name as string | null;

      if (!clerkId) break;

      await db.teacher.updateMany({
        where: { clerkId },
        data: {
          ...(primaryEmail && { email: primaryEmail }),
          ...(firstName && { firstName }),
          ...(lastName !== undefined && { lastName: lastName ?? "" }),
        },
      });
      break;
    }

    // user.created is handled by the onboarding flow — no action needed here.
    // Future: if you allow student/parent sign-ups, handle them here.
    case "user.created":
      break;

    default:
      break;
  }

  return Response.json({ received: true });
}
