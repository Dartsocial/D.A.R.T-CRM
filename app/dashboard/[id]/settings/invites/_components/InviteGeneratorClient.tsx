// app/components/invite/InviteGeneratorClient.tsx
"use client";

import InviteGenerator from "./InviteGenerator";

export default function InviteGeneratorClient({
  defaultRole = "client",
  roles,
}: {
  defaultRole?: string;
  roles: string[];
}) {
  return (
    <div className="w-full mt-10">
      <InviteGenerator defaultRole={defaultRole} roles={roles} />
    </div>
  );
}
