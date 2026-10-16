import { FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";

// Grants a single family member READ-ONLY access to one policy. There is no
// UI path to grant write access — it doesn't exist in the data model
// (SharedAccess) or the API (sharing.ts) either.
export function Share() {
  const [searchParams] = useSearchParams();
  const policyId = searchParams.get("policyId") ?? "";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!policyId) {
      setStatus("Open this page from a specific policy to share it.");
      return;
    }
    await api.inviteShare(policyId, email);
    setStatus(`Invited ${email} with read-only access.`);
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto" }}>
      <h1>Share with family</h1>
      <p style={{ color: "#57606a" }}>
        You can share one policy with one family member. They will only ever be able to view it —
        never edit, delete, or share it further.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="family-member@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 12 }}
          required
        />
        <button type="submit">Send read-only invite</button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
}
