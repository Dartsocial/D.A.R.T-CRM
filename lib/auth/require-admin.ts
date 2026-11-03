import { createClient } from "@/utils/supabase/server";

const ADMIN_ROLES = new Set(["admin", "admin1", "role_admin", "system_admin"]);

export async function requireAdmin() {
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) return { authorized: false as const, status: 401 as const };

  const serviceClient = await createClient("service");
  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.role) {
    return { authorized: false as const, status: 403 as const };
  }

  const { data: roleById } = await serviceClient
    .from("roles")
    .select("role")
    .eq("id", profile.role)
    .maybeSingle();
  const roleName = roleById?.role ?? profile.role;

  if (!ADMIN_ROLES.has(String(roleName).trim().toLowerCase())) {
    return { authorized: false as const, status: 403 as const };
  }

  return { authorized: true as const, user, serviceClient };
}