import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  try {
    const data = await req.json();
    const { id } = data;

    if (!id) {
      return NextResponse.json({ error: "Specialization ID is required" }, { status: 400 });
    }

    const supabase = auth.serviceClient;

    // First, check if there are any users with this specialization
    const { count, error: countError } = await supabase
      .from("user_specializations")
      .select("*", { count: "exact", head: true })
      .eq("specialization_id", id);

    if (countError) {
      console.error("Error checking specialization usage:", countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // If specialization is in use, ask user to remove assignments first
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "Cannot delete specialization that is assigned to users. Remove all user assignments first." },
        { status: 409 }
      );
    }

    // Delete the specialization
    const { error } = await supabase
      .from("specializations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting specialization:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Specialization deleted successfully" });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}