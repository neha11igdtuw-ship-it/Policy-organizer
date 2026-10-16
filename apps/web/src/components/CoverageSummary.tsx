import { PolicyDTO } from "../api/client";

export function CoverageSummary({ policies }: { policies: PolicyDTO[] }) {
  const totalCoverage = policies.reduce((sum, p) => sum + Number(p.coverageAmount ?? 0), 0);
  const totalPremium = policies.reduce((sum, p) => sum + Number(p.premiumAmount ?? 0), 0);

  return (
    <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
      <SummaryStat label="Policies" value={String(policies.length)} />
      <SummaryStat label="Total coverage" value={totalCoverage.toLocaleString()} />
      <SummaryStat label="Total annual premium" value={totalPremium.toLocaleString()} />
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 13, color: "#57606a" }}>{label}</div>
    </div>
  );
}
