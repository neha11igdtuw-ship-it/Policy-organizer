// Typed fetch client for the Node/Express API.
//
// TODO(real-auth): `getAuthToken` should read the real Cognito id token from
// the auth session (e.g. amazon-cognito-identity-js or aws-amplify Auth).
// Stubbed here so the rest of the app has a real call site to build against.

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

function getAuthToken(): string | null {
  // TODO(real-auth): replace with real Cognito session token retrieval.
  return localStorage.getItem("po_dev_token");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ? JSON.stringify(body.error) : `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface PolicyFieldDTO {
  id: string;
  fieldName: string;
  value: string;
  confidenceScore: number;
  userConfirmed: boolean;
}

export interface PolicyDTO {
  id: string;
  policyType: "LIFE" | "ANNUITY" | "HEALTH";
  carrier: string | null;
  policyNumber: string | null;
  coverageAmount: string | null;
  premiumAmount: string | null;
  renewalDate: string | null;
  surrenderDate: string | null;
  fields: PolicyFieldDTO[];
}

export const api = {
  listPolicies: () => request<{ policies: PolicyDTO[] }>("/api/policies"),

  getPolicy: (id: string) => request<{ policy: PolicyDTO }>(`/api/policies/${id}`),

  updateField: (policyId: string, fieldId: string, value: string) =>
    request<{ field: PolicyFieldDTO }>(`/api/policies/${policyId}/fields/${fieldId}`, {
      method: "PATCH",
      body: JSON.stringify({ value, userConfirmed: true }),
    }),

  deletePolicy: (id: string) => request<void>(`/api/policies/${id}`, { method: "DELETE" }),

  requestUploadUrl: (fileName: string, contentType: string, policyType: PolicyDTO["policyType"]) =>
    request<{ uploadUrl: string; policyId: string; s3Key: string }>("/api/upload/request-url", {
      method: "POST",
      body: JSON.stringify({ fileName, contentType, policyType }),
    }),

  confirmUpload: (policyId: string) =>
    request<{ status: string }>("/api/upload/confirm", {
      method: "POST",
      body: JSON.stringify({ policyId }),
    }),

  listReminders: () => request<{ reminders: any[] }>("/api/reminders"),

  inviteShare: (policyId: string, invitedEmail: string) =>
    request<{ sharedAccess: any }>("/api/sharing/invite", {
      method: "POST",
      body: JSON.stringify({ policyId, invitedEmail }),
    }),

  revokeShare: (id: string) => request<void>(`/api/sharing/${id}/revoke`, { method: "POST" }),
};
