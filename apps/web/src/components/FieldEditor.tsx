import { useState } from "react";
import { PolicyFieldDTO } from "../api/client";
import { ConfidenceBadge } from "./ConfidenceBadge";

interface Props {
  field: PolicyFieldDTO;
  onSave: (fieldId: string, value: string) => Promise<void>;
}

// Review screen building block: shows one extracted field, its confidence
// score, and lets the user correct the value. Saving marks userConfirmed=true
// on the backend (see api/client.ts#updateField).
export function FieldEditor({ field, onSave }: Props) {
  const [value, setValue] = useState(field.value);
  const [saving, setSaving] = useState(false);

  const dirty = value !== field.value;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(field.id, value);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
      <label style={{ width: 160, fontWeight: 600 }}>{field.fieldName}</label>
      <input value={value} onChange={(e) => setValue(e.target.value)} style={{ flex: 1 }} />
      <ConfidenceBadge confidence={field.confidenceScore} />
      {field.userConfirmed && !dirty ? (
        <span style={{ color: "#1a7f37", fontSize: 12 }}>Confirmed</span>
      ) : (
        <button onClick={handleSave} disabled={saving || !dirty}>
          {saving ? "Saving..." : "Confirm"}
        </button>
      )}
    </div>
  );
}
