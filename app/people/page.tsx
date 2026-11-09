import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import PeopleAdmin from "@/components/people/PeopleAdmin";

export const metadata = {
  title: "Shirt Day",
  robots: { index: false, follow: false },
};

export default async function PeoplePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/people/sign-in");
  }

  if (!user.email?.toLowerCase().endsWith("@dartontarget.org")) {
    redirect("/people/sign-in?reason=domain");
  }

  return <PeopleAdmin />;
}
