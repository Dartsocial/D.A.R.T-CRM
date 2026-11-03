import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  const supabase = auth.serviceClient;

  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error("Failed to fetch users:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const simplifiedUsers = data.users.map((user) => ({
    id: user.id,
    email: user.email || null,
    display_name: user.user_metadata?.display_name || null,
  }));

  return NextResponse.json(simplifiedUsers);
}
