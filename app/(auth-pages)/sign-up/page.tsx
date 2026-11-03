import Link from "next/link";
import type { Metadata } from "next";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ invite?: string; role?: string }> }): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const role = resolvedSearchParams?.role || "client";

  const roleName = {
    admin: "Admin",
    job_coach: "Job Coach",
    client: "Client",
    anonymous: "User"
  }[role] || "User";

  return {
    title: `Invite to join as ${roleName}`,
    description: `You've been invited to join as a ${roleName} on the CMS Schedule App.`,
    openGraph: {
      title: `Join as a ${roleName}`,
      description: `Create an account and get started as a ${roleName} on the CMS Schedule App.`,
      images: [`/images/${role}.png`]
    },
    twitter: {
      card: "summary_large_image",
      title: `Join as a ${roleName}`,
      description: `You've been invited to create an account as a ${roleName}.`,
      images: [`/images/${role}.png`]
    }
  };
}

export default function Signup() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(var(--background))] via-[hsl(var(--muted))] to-[hsl(var(--accent))] px-4 md:px-6 lg:px-12">
      <div className="mx-auto w-full max-w-2xl rounded-[var(--radius)] bg-[hsl(var(--card))] shadow-[var(--shadow-xl)] p-8 md:p-10">
        <h1 className="text-3xl font-[var(--font-serif)] font-bold text-center text-[hsl(var(--sidebar-primary))] mb-4 leading-[1.2]">Account invitation required</h1>
        <p className="text-center text-[hsl(var(--muted-foreground))]">
          Accounts are created by your organization. Open the invitation sent to your email address to set up your account.
        </p>

        <p className="text-center text-sm mt-6 text-[hsl(var(--muted-foreground))] font-[var(--font-sans)] leading-[1.5]">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-[hsl(var(--sidebar-primary))] hover:underline transition-all duration-200">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}