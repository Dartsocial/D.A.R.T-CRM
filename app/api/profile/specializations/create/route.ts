import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  try {
    const data = await req.json();
    const { name, description, color, role_type } = data;

    if (!name || !role_type) {
      return NextResponse.json({ error: "Name and role type are required" }, { status: 400 });
    }

    const supabase = auth.serviceClient;

    // First, get the role ID for the specified role type
    const { data: roleData, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("role", role_type)
      .single();

    if (roleError) {
      console.error("Error fetching role ID:", roleError);
      return NextResponse.json({ error: "Invalid role type" }, { status: 400 });
    }

    const role_id = roleData.id;

    // Insert the new specialization
    const { data: newSpecialization, error } = await supabase
      .from("specializations")
      .insert({
        name,
        description,
        role_id,
        color
      })
      .select("id, name, description, color, role_id")
      .single();

    if (error) {
      console.error("Error creating specialization:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return the new specialization with the role type
    const result = {
      ...newSpecialization,
      role_type
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}