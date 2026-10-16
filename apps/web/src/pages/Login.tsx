import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

// TODO(real-auth): Replace this stub with real Cognito Hosted UI / SRP sign-in
// (e.g. via aws-amplify's Auth.signIn or amazon-cognito-identity-js), MFA
// challenge included. For now this just stores a fake dev token so the rest
// of the app (api/client.ts#getAuthToken) has something to send.
export function Login() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    localStorage.setItem("po_dev_token", btoa(email || "dev-user"));
    navigate("/dashboard");
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto" }}>
      <h1>Policy Organizer</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 12 }}
          required
        />
        <button type="submit" style={{ width: "100%", padding: 8 }}>
          Sign in (dev stub — MFA via Cognito in production)
        </button>
      </form>
    </div>
  );
}
