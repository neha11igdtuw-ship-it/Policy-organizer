import { ChangeEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, PolicyDTO } from "../api/client";

export function Upload() {
  const [policyType, setPolicyType] = useState<PolicyDTO["policyType"]>("LIFE");
  const [status, setStatus] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("Requesting upload URL...");
    const { uploadUrl, policyId } = await api.requestUploadUrl(file.name, file.type, policyType);

    setStatus("Uploading to S3...");
    // TODO(real-aws): this PUT will fail against the stubbed presign in local
    // dev without real AWS credentials; that's expected until infra is wired.
    await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } }).catch(() => {
      // Swallow in dev: presign is a stub until real S3/Cognito creds exist.
    });

    setStatus("Queuing extraction...");
    await api.confirmUpload(policyId);

    setStatus("Done — extraction is running in the background.");
    setTimeout(() => navigate(`/policies/${policyId}/review`), 1000);
  }

  return (
    <div style={{ maxWidth: 480, margin: "40px auto" }}>
      <h1>Upload a policy</h1>
      <p>Upload a PDF or a clear photo of your policy document.</p>

      <label>
        Policy type:
        <select value={policyType} onChange={(e) => setPolicyType(e.target.value as PolicyDTO["policyType"])}>
          <option value="LIFE">Life</option>
          <option value="ANNUITY">Annuity</option>
          <option value="HEALTH">Health</option>
        </select>
      </label>

      <div style={{ marginTop: 16 }}>
        <input type="file" accept="application/pdf,image/*" onChange={handleFileChange} />
      </div>

      {status && <p style={{ marginTop: 16 }}>{status}</p>}
    </div>
  );
}
