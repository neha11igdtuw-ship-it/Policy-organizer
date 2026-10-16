import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, PolicyDTO } from "../api/client";
import { FieldEditor } from "../components/FieldEditor";

// Review screen: user confirms/corrects each extracted field before it
// becomes part of the dashboard. Each save marks userConfirmed=true on the
// PolicyField row (see apps/api/src/routes/policies.ts PATCH handler), which
// is the signal used to measure the "70% accepted without edits" metric.
export function Review() {
  const { id } = useParams<{ id: string }>();
  const [policy, setPolicy] = useState<PolicyDTO | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    api.getPolicy(id).then((res) => setPolicy(res.policy));
  }, [id]);

  if (!policy) return <p>Loading...</p>;

  async function handleSave(fieldId: string, value: string) {
    const { field } = await api.updateField(policy!.id, fieldId, value);
    setPolicy((prev) =>
      prev ? { ...prev, fields: prev.fields.map((f) => (f.id === field.id ? field : f)) } : prev
    );
  }

  const allConfirmed = policy.fields.every((f) => f.userConfirmed);

  return (
    <div style={{ maxWidth: 640, margin: "40px auto" }}>
      <h1>Review extracted fields</h1>
      <p style={{ color: "#57606a" }}>
        Low-confidence fields are worth double-checking against your original document.
      </p>

      {policy.fields.length === 0 && <p>No fields extracted yet — extraction may still be running.</p>}

      {policy.fields.map((field) => (
        <FieldEditor key={field.id} field={field} onSave={handleSave} />
      ))}

      <button
        disabled={!allConfirmed}
        style={{ marginTop: 24 }}
        onClick={() => navigate(`/policies/${policy.id}`)}
      >
        Continue to dashboard
      </button>
    </div>
  );
}
