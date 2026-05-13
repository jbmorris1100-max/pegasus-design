/** Pegasus Design — API Client */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {} } = options;

    const config: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${path}`, config);
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || `API ${res.status}`);
    }
    return res.json();
  }

  get<T>(path: string) { return this.request<T>(path); }
  post<T>(path: string, body?: unknown) { return this.request<T>(path, { method: "POST", body }); }
  put<T>(path: string, body?: unknown) { return this.request<T>(path, { method: "PUT", body }); }
  delete<T>(path: string) { return this.request<T>(path, { method: "DELETE" }); }
}

export const api = new ApiClient();
