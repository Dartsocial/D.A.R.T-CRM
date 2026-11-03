"use client";

import { useEffect, useState } from "react";

export default function InviteGenerator({
  defaultRole = "client",
  roles,
}: {
  defaultRole?: string;
  roles: string[];
}) {
  const [role, setRole] = useState(defaultRole);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (roles.length && !roles.includes(role)) {
      setRole(roles[0]);
    }
  }, [role, roles]);

  const handleGenerateInvite = async () => {
    setLoading(true);
    setError("");
    setSentEmail("");

    try {
      const res = await fetch("/api/invite/create", {
        method: "POST",
        body: JSON.stringify({ role, email, displayName }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send invitation.");
      } else {
        setSentEmail(data.email);
      }
    } catch {
      setError("Could not send invitation. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-card text-card-foreground p-6 rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Generate Invite Link</h2>

      <label htmlFor="invite-name" className="block mb-2 font-medium">Company member name</label>
      <input
        id="invite-name"
        type="text"
        autoComplete="name"
        required
        maxLength={120}
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        placeholder="Michelle Garcia"
        className="w-full mb-4 p-2 rounded border"
      />

      <label htmlFor="invite-email" className="block mb-2 font-medium">Company member email</label>
      <input
        id="invite-email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="name@company.com"
        className="w-full mb-4 p-2 rounded border"
      />

      <label className="block mb-2 font-medium">Select Role:</label>
      <select
        className="w-full mb-4 p-2 rounded border"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        disabled={roles.length === 0}
      >
        {roles.map((roleName) => <option key={roleName} value={roleName}>{roleName}</option>)}
      </select>

      <button
        onClick={handleGenerateInvite}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        disabled={loading || !roles.length || !displayName.trim() || !email.trim()}
      >
        {loading ? "Sending..." : "Send Invitation"}
      </button>

      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      {sentEmail && (
        <p role="status" className="mt-4 text-sm text-green-700">
          Invitation sent to {sentEmail}.
        </p>
      )}
    </div>
  );
}