import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  let body: { uuid?: string; role?: string; specializations?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { uuid, role, specializations } = body;
  const supabase = auth.serviceClient;

  if (!uuid || !role) {
    return NextResponse.json({ error: "Missing UUID or role" }, { status: 400 });
  }

  // Get role ID from role name
  const { data: roleData, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("role", role)
    .single();

  if (roleError || !roleData) {
    return NextResponse.json({ error: "Failed to fetch role ID" }, { status: 500 });
  }

  const roleId = roleData.id;

  // Update user's role
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: roleId })
    .eq("id", uuid);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Handle optional specialization assignment
  if (Array.isArray(specializations)) {
    // Remove current specializations
    await supabase
      .from("user_specializations")
      .delete()
      .eq("user_id", uuid);

    if (specializations.length > 0) {
      const inserts = specializations.map((specId: string) => ({
        user_id: uuid,
        specialization_id: specId,
          assigned_by: auth.user.id,
      }));

      const { error: insertError } = await supabase
        .from("user_specializations")
        .insert(inserts);

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({
    message: `Role updated to '${roleId}' for user ${uuid}`,
    specializations: specializations ?? [],
  });
}