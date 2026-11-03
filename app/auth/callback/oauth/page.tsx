"use client";

import { useEffect } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { getCookie, removeCookie } from "@/lib/cookieUtils"; // Adjust path as needed

export default function OAuthCallback() {
  const supabase = useSupabaseClient();

  useEffect(() => {
    (async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("OAuth session error:", sessionError.message);
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const invite = urlParams.get("invite");

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;

      if (user && invite) {
        const response = await fetch('/api/apply-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invite }),
        });

        if (!response.ok) {
          await supabase.auth.signOut();
          window.location.href = '/sign-in?error=invalid-invitation-link';
          return;
        }

        window.location.href = '/protected/reset-password';
        return;
      }

      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError || !profile) {
          await supabase.auth.signOut();
          window.location.href = '/sign-in?error=invitation-required';
          return;
        }
      }

      // 6. Get last page from cookie and redirect there
      const lastPage = getCookie('lastPage') || '/';
      
      // Clear the cookie after using it
      removeCookie('lastPage');
      
      // Exclude auth pages from redirect
      const excludedPages = ['/sign-in', '/sign-up', '/forgot-password'];
      const pageWithoutHash = lastPage.split('#')[0]; // Handle hash routes
      
      let redirectTo = lastPage;
      if (excludedPages.includes(pageWithoutHash)) {
        console.log(`[OAuth] Excluded page detected (${lastPage}), redirecting to /`);
        redirectTo = '/';
      }
      
      console.log(`[OAuth] Redirecting to: ${redirectTo}`);
      window.location.href = `${redirectTo}?refresh=true`;
    })();
  }, [supabase]);

  return (
    <p className="p-10 text-center text-sm text-gray-600 dark:text-gray-300">
      Completing&nbsp;sign‑in…
    </p>
  );
}