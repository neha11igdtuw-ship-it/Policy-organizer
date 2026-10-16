import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, PolicyDTO } from "../api/client";
import { CoverageSummary } from "../components/CoverageSummary";
import { PolicyCard } from "../components/PolicyCard";
import { UpcomingDates } from "../components/UpcomingDates";

export function Dashboard() {
  const [policies, setPolicies] = useState<PolicyDTO[]>([]);

  useEffect(() => {
    api.listPolicies().then((res) => setPolicies(res.policies));
  }, []);

  return (
    <div style={{ maxWidth: 720, margin: "40px auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Your policies</h1>
        <Link to="/upload">+ Upload a policy</Link>
      </div>

      <CoverageSummary policies={policies} />

      <h2>Upcoming dates</h2>
      <UpcomingDates policies={policies} />

      <h2>All policies</h2>
      {policies.map((p) => (
        <PolicyCard key={p.id} policy={p} />
      ))}
    </div>
  );
}
