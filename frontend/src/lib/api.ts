const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

export const api = {
  request: async (path: string, options?: RequestInit) => {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, options);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || `API ${res.status}`);
    }
    return res.json();
  },
  get: (path: string) => api.request(path),
  post: (path: string, body?: unknown) =>
    api.request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: (path: string, body?: unknown) =>
    api.request(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (path: string) =>
    api.request(path, { method: "DELETE" }),
};
