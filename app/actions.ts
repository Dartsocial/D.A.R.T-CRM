"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { encodedRedirect } from "@/utils/utils";
import { cookies } from "next/headers";

const getAndClearLastPage = async (): Promise<string> => {
  const store = await cookies();
  const allCookies = store.getAll();
  const lastPageCookie = allCookies.find((c) => c.name === "lastPage");
  let lastPage = lastPageCookie?.value || "/";
  store.delete("lastPage");
  const excludedPages = ["/sign-in", "/sign-up", "/forgot-password"];
  const pageWithoutHash = lastPage.split('#')[0];
  if (excludedPages.includes(pageWithoutHash)) {
    console.log(`[Auth] Excluded page detected (${lastPage}), redirecting to /`);
    lastPage = "/";
  }
  console.log(`[Auth] Redirecting to: ${lastPage}`);
  return lastPage;
};

// 🍎 Enhanced populateUserCookies function with Remember Me support
const populateUserCookies = async (userId: string, remember: boolean = false) => {
  try {
    const supabase = await createClient();
    const store = await cookies();
    
    console.log(`[Auth] 🍪 Populating cookies for user ${userId.slice(-4)} (remember: ${remember})`);
    
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("role, display_name, department, specialization, avatar_url")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("[Auth] ❌ Profile fetch failed:", profileError.message);
      return;
    }

    if (!profileData?.role) {
      console.error("[Auth] ❌ No role found in profile");
      return;
    }

    const validRoles = ['admin1', 'coachx7', 'client7x', 'user0x'];
    if (!validRoles.includes(profileData.role)) {
      console.warn(`[Auth] ⚠️ Invalid role: ${profileData.role}, using user0x`);
      profileData.role = 'user0x';
    }

    // 🍎 Enhanced cookie options with Remember Me support
    const cookieOptions = {
      path: "/",
      secure: true,
      sameSite: "lax" as const,
      // Adjust maxAge based on remember me setting
      maxAge: remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // 30 days vs 1 day
    };

    console.log(`[Auth] 🍪 Setting cookies with ${remember ? '30-day' : '1-day'} expiry`);

    store.set("userRole", profileData.role, cookieOptions);
    store.set("userRoleUserId", userId, cookieOptions);

    // Store remember me preference for iOS session persistence
    store.set("rememberMe", remember.toString(), cookieOptions);

    if (profileData.display_name) {
      store.set("userDisplayName", profileData.display_name, cookieOptions);
    }

    if (profileData.department) {
      store.set("userDepartment", profileData.department, cookieOptions);
    }

    const rolePermissions = await supabase
      .rpc('get_role_permissions', {
        user_role_type: profileData.role
      });

    if (!rolePermissions.error && rolePermissions.data) {
      const permissionsData = {
        timestamp: Date.now(),
        permissions: rolePermissions.data,
        role: profileData.role
      };
      
      store.set("userPermissions", JSON.stringify(permissionsData), { 
        maxAge: 5 * 60, // Permissions expire faster for security
        path: "/",
        secure: true,
        sameSite: "lax" 
      });
    }

    console.log(`[Auth] ✅ Cookies populated successfully for ${profileData.role} user (remember: ${remember})`);
    
  } catch (error) {
    console.error("[Auth] ❌ Cookie population failed:", error);
  }
};

export const signUpAction = async (_formData: FormData) => {
  return encodedRedirect("error", "/sign-up", "Accounts can only be created from an organization invitation.");
};

// 🍎 Enhanced signInAction with Remember Me support
export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const remember = formData.get("remember") === "true"; // Get remember me value
  const supabase = await createClient();

  console.log("[Auth] 🔐 Sign-in attempt for:", email, "| Remember me:", remember);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("[Auth] ❌ Sign-in failed:", error.message);
    return encodedRedirect("error", "/sign-in", error.message);
  }

  if (!data.user?.id) {
    console.error("[Auth] ❌ No user data returned");
    return encodedRedirect("error", "/sign-in", "Authentication failed");
  }

  console.log(`[Auth] ✅ Sign-in successful for user ${data.user.id.slice(-4)}`);

  // 🍎 Enhanced cookie population with Remember Me support
  await populateUserCookies(data.user.id, remember);

  const lastPage = await getAndClearLastPage();
  console.log(`[Auth] 🚀 Redirecting to: ${lastPage}`);
  
  return redirect(`${lastPage}?refresh=true`);
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error("❌ Forgot password error:", error.message);
    return encodedRedirect("error", "/forgot-password", "Could not reset password");
  }

  if (callbackUrl) return redirect(callbackUrl);

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password."
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return encodedRedirect("error", "/protected/reset-password", "Password and confirm password are required");
  }

  if (password.length < 12) {
    return encodedRedirect("error", "/protected/reset-password", "Password must be at least 12 characters");
  }

  if (password !== confirmPassword) {
    return encodedRedirect("error", "/protected/reset-password", "Passwords do not match");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return encodedRedirect("error", "/protected/reset-password", "Password update failed");
  }

  return encodedRedirect("success", "/protected/reset-password", "Password updated");
};

// 🍎 Enhanced signOutAction with remember me cleanup
export const signOutAction = async () => {
  const supabase = await createClient();
  const store = await cookies();
  
  console.log("[Auth] 🚪 Signing out and clearing cookies");
  
  store.delete("userRole");
  store.delete("userRoleUserId");
  store.delete("userDisplayName");
  store.delete("userDepartment");
  store.delete("userPermissions");
  store.delete("rememberMe"); // Clear remember me preference
  
  await supabase.auth.signOut();
  return redirect("/sign-in");
};