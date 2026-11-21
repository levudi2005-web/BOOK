export const API_BASE = process.env.E2E_API_URL ?? 'http://127.0.0.1:3101';

export function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 100000)}`;
}

export const creds = {
  userA: { username: `e2e_a_${uniqueSuffix()}`, email: `e2e_a_${uniqueSuffix()}@example.com`, password: 'password123' },
  userB: { username: `e2e_b_${uniqueSuffix()}`, email: `e2e_b_${uniqueSuffix()}@example.com`, password: 'password123' },
};

export const admin = {
  username: process.env.E2E_ADMIN_USER ?? 'e2e_admin',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'AdminPass123!',
};

export async function api(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown,
  token?: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    parsed = { raw: text };
  }
  return { status: response.status, body: parsed };
}
