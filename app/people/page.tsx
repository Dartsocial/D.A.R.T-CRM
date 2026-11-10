import PeopleAdmin from "@/components/people/PeopleAdmin";

export const metadata = {
  title: "Shirt Day",
  robots: { index: false, follow: false },
};

export default function PeoplePage() {
  return <PeopleAdmin />;
}
