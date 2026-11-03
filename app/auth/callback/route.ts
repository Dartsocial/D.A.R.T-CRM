import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const urlInvite = requestUrl.searchParams.get("invite");
  const redirectTo = requestUrl.searchParams.get("redirect_to") ?? "/CMS";
  const cookieStore = cookies();
  let acceptedInvite = false;

  if (code) {
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return NextResponse.redirect(new URL("/sign-in?error=invalid-invitation-link", requestUrl.origin));
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const userId = user.id;
      const metaInvite = user.user_metadata?.invite;
      const inviteCode = urlInvite || metaInvite;
      const serviceClient = await createClient("service");

      if (inviteCode) {
        const invitedDisplayName = typeof user.user_metadata?.display_name === "string"
          ? user.user_metadata.display_name.trim()
          : "";
        const { data: invite, error: inviteError } = await serviceClient
          .from("invites")
          .select("role_id, email")
          .eq("code", inviteCode)
          .maybeSingle();

        if (inviteError || !invite || invite.email?.toLowerCase() !== user.email?.toLowerCase()) {
          await supabase.auth.signOut();
          const reason = invite && !inviteError ? "invite-email-mismatch" : "invalid-invite";
          return NextResponse.redirect(new URL(`/sign-in?error=${reason}`, requestUrl.origin));
        }

        const { data: existingProfile, error: profileReadError } = await serviceClient
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();

        if (profileReadError) {
          await supabase.auth.signOut();
          return NextResponse.redirect(new URL("/sign-in?error=invite-setup-failed", requestUrl.origin));
        }

        const profileValues = {
          role: invite.role_id,
          ...(invitedDisplayName ? { display_name: invitedDisplayName } : {}),
        };
        const { error: profileWriteError } = existingProfile
          ? await serviceClient.from("profiles").update(profileValues).eq("id", userId)
          : await serviceClient.from("profiles").insert({ id: userId, ...profileValues });

        if (profileWriteError) {
          await supabase.auth.signOut();
          return NextResponse.redirect(new URL("/sign-in?error=invite-setup-failed", requestUrl.origin));
        }

        const { error: deleteInviteError } = await serviceClient
          .from("invites")
          .delete()
          .eq("code", inviteCode);

        if (deleteInviteError) {
          await supabase.auth.signOut();
          return NextResponse.redirect(new URL("/sign-in?error=invite-setup-failed", requestUrl.origin));
        }

        acceptedInvite = true;
        await supabase.auth.updateUser({ data: { invite: null } });
      } else {
        const { data: existingProfile, error: existingProfileError } = await serviceClient
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

        if (existingProfileError || !existingProfile) {
          await supabase.auth.signOut();
          return NextResponse.redirect(new URL("/sign-in?error=invitation-required", requestUrl.origin));
        }
      }

      const { data: profile, error: profileError } = await serviceClient
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle();

      if (!profileError && !profile?.display_name) {
        const defaultName = user.email?.split("@")[0];
        if (defaultName) {
          await serviceClient
            .from("profiles")
            .update({ display_name: defaultName })
            .eq("id", userId);
        }
      }

    }
  } else if (urlInvite) {
    return NextResponse.redirect(new URL("/sign-in?error=invalid-invitation-link", requestUrl.origin));
  }

  const safeRedirect = redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/CMS";
  const destination = acceptedInvite ? "/protected/reset-password" : safeRedirect;
  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}