/** Pegasus Design — API Client */

// ── Global fetch interceptor — blocks any absolute backend URL ──
if (typeof window !== "undefined") {
  const _origFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    let url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("http://backend:8000") || url.includes("https://backend:8000")) {
      const safe = url
        .replace("http://backend:8000", window.location.origin)
        .replace("https://backend:8000", window.location.origin);
      console.warn(
        "[Pegasus] BLOCKED absolute backend URL:",
        url,
        "→ redirected to:",
        safe,
        "\nStack:",
        new Error().stack
      );
      url = safe;
      if (typeof input === "string") input = url;
      else if (input instanceof URL) input = new URL(url);
      else input = { ...input, url };
    }
    return _origFetch.call(window, input, init);
  } as typeof fetch;
}

// ── Dynamic origin-based API base ──────────────────────────────
const getApiBase = (): string => {
  if (typeof window !== "undefined") {
    return window.location.origin + "/api/v1";
  }
  return "/api/v1";
};

let _apiBase: string | null = null;
const apiBase = (): string => {
  if (!_apiBase) _apiBase = getApiBase();
  return _apiBase;
};

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
      headers: { "Content-Type": "application/json", ...headers },
    };

    if (body) config.body = JSON.stringify(body);

    const res = await fetch(`${apiBase()}${path}`, config);
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
