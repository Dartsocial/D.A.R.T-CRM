// ❌ DO NOT include: "use client"

import { redirect } from "next/navigation";
import { getServerSession } from "@/app/auth/session";
import { resetPasswordAction } from "@/app/actions";
import { FormMessage, type Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/Layouts/appheader/input";
import { Label } from "@/components/ui/label";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Message>;
}) {
  const supabase = await getServerSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const message = await searchParams;

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold">Set your password</h1>
      <p className="mb-6 text-sm text-muted-foreground">Choose a password for your account.</p>
      <form action={resetPasswordAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" minLength={12} autoComplete="new-password" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" minLength={12} autoComplete="new-password" required />
        </div>
        <SubmitButton pendingText="Updating password...">Set password</SubmitButton>
        <FormMessage message={message} />
      </form>
    </main>
  );
}