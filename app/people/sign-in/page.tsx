import type { Metadata } from "next";
import PeopleSignIn from "@/components/people/PeopleSignIn";

export const metadata: Metadata = {
  title: "Staff sign in",
  robots: { index: false, follow: false },
};

export default function PeopleSignInPage() {
  return <PeopleSignIn />;
}
