import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, PolicyDTO } from "../api/client";

export function PolicyDetail() {
  const { id } = useParams<{ id: string }>();
  const [policy, setPolicy] = useState<PolicyDTO | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    api.getPolicy(id).then((res) => setPolicy(res.policy));
  }, [id]);

  if (!policy) return <p>Loading...</p>;

  async function handleDelete() {
    // Hard delete: removes the S3 object, all dependent DB rows, and writes
    // an AuditLog entry server-side. See apps/api/src/routes/policies.ts.
    if (!confirm("Permanently delete this policy and all associated data? This cannot be undone.")) {
      return;
    }
    await api.deletePolicy(policy!.id);
    navigate("/dashboard");
  }

  return (
    <div style={{ maxWidth: 640, margin: "40px auto" }}>
      <Link to="/dashboard">&larr; Back to dashboard</Link>
      <h1>
        {policy.carrier ?? "Unknown carrier"} — {policy.policyType}
      </h1>
      <p>Policy #: {policy.policyNumber ?? "—"}</p>
      <p>Coverage: {policy.coverageAmount ?? "—"}</p>
      <p>Premium: {policy.premiumAmount ?? "—"}</p>
      <p>Renewal date: {policy.renewalDate ?? "—"}</p>
      <p>Surrender date: {policy.surrenderDate ?? "—"}</p>

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <Link to={`/policies/${policy.id}/review`}>Edit extracted fields</Link>
        <Link to="/share">Share with family</Link>
        <button onClick={handleDelete} style={{ color: "#cf222e" }}>
          Delete permanently
        </button>
      </div>
    </div>
  );
}
