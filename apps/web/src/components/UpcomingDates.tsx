import { PolicyDTO } from "../api/client";

export function UpcomingDates({ policies }: { policies: PolicyDTO[] }) {
  const dated = policies
    .flatMap((p) => [
      p.renewalDate && { policyId: p.id, label: "Renewal", date: p.renewalDate, carrier: p.carrier },
      p.surrenderDate && { policyId: p.id, label: "Surrender window", date: p.surrenderDate, carrier: p.carrier },
    ])
    .filter((x): x is { policyId: string; label: string; date: string; carrier: string | null } => Boolean(x))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (dated.length === 0) {
    return <p style={{ color: "#57606a" }}>No upcoming dates yet.</p>;
  }

  return (
    <ul>
      {dated.map((d, i) => (
        <li key={i}>
          {d.label} — {d.carrier ?? "Policy"} on {new Date(d.date).toDateString()}
        </li>
      ))}
    </ul>
  );
}
