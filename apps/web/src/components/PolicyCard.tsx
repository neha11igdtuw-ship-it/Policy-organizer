import { Link } from "react-router-dom";
import { PolicyDTO } from "../api/client";

export function PolicyCard({ policy }: { policy: PolicyDTO }) {
  return (
    <Link
      to={`/policies/${policy.id}`}
      style={{
        display: "block",
        border: "1px solid #d0d7de",
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div style={{ fontWeight: 700 }}>{policy.carrier ?? "Unknown carrier"}</div>
      <div style={{ fontSize: 13, color: "#57606a" }}>{policy.policyType}</div>
      <div style={{ fontSize: 13 }}>Policy #: {policy.policyNumber ?? "pending review"}</div>
      <div style={{ fontSize: 13 }}>
        Coverage: {policy.coverageAmount ?? "—"} · Premium: {policy.premiumAmount ?? "—"}
      </div>
    </Link>
  );
}
