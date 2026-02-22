export function clientApiBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_PLATFORM_API_BASE_URL || 'http://127.0.0.1:8787';
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export async function clientApiRequest(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${clientApiBaseUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(init?.headers || {})
    }
  });

  const text = await response.text();
  let payload: unknown = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
}
