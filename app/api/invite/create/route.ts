import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  let body: { role?: string; email?: string; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const role = body.role?.trim();
  const email = body.email?.trim().toLowerCase();
  const displayName = body.displayName?.trim();
  if (!role || !email || !displayName || displayName.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A member name, valid email, and role are required" }, { status: 400 });
  }

  const { serviceClient } = auth;

  // 1. Look up role ID
  const { data: roleData, error: roleError } = await serviceClient
    .from("roles")
    .select("id")
    .eq("role", role)
    .single();

  if (roleError || !roleData) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // 2. Create invite
  const code = randomUUID();
  const { error: insertError } = await serviceClient.from("invites").insert([
    { code, role_id: roleData.id, email, inviter_id: auth.user.id, max_uses: 1 }
  ]);

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    await serviceClient.from("invites").delete().eq("code", code);
    return NextResponse.json({ error: "Site URL is not configured" }, { status: 500 });
  }

  const { error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: { invite: code, display_name: displayName },
    redirectTo: `${siteUrl}/auth/callback?invite=${encodeURIComponent(code)}`,
  });

  if (inviteError) {
    await serviceClient.from("invites").delete().eq("code", code);
    return NextResponse.json({ error: "Could not send invitation email" }, { status: 500 });
  }

  return NextResponse.json({ success: true, email });
}