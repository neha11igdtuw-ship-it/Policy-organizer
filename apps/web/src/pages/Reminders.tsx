import { useEffect, useState } from "react";
import { api } from "../api/client";

export function Reminders() {
  const [reminders, setReminders] = useState<any[]>([]);

  useEffect(() => {
    api.listReminders().then((res) => setReminders(res.reminders));
  }, []);

  return (
    <div style={{ maxWidth: 640, margin: "40px auto" }}>
      <h1>Reminders</h1>
      {reminders.length === 0 && <p>No reminders yet.</p>}
      <ul>
        {reminders.map((r) => (
          <li key={r.id}>
            {r.type} — due {new Date(r.dueDate).toDateString()} {r.sentAt ? "(sent)" : "(pending)"}
          </li>
        ))}
      </ul>
    </div>
  );
}
