export class ApiError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode = 500, code = "INTERNAL_SERVER_ERROR") {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:4000";

type RequestOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined | null>;
};

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...customConfig } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const config: RequestInit = {
    headers: {
      ...(customConfig.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    credentials: "include", // Sends HttpOnly cookie automatically without client token storage
    ...customConfig,
  };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch {
    throw new ApiError(
      `Unable to connect to CredChain API server at ${API_BASE_URL}. Ensure backend is running.`,
      0,
      "NETWORK_ERROR"
    );
  }

  if (response.status === 204) {
    return null as T;
  }

  let data: Record<string, string> | string | null = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorObj = typeof data === "object" && data !== null ? data : {};
    const message = errorObj.message || errorObj.error || `Request failed with status ${response.status}`;
    const code = errorObj.error || errorObj.code || "API_ERROR";
    throw new ApiError(String(message), response.status, String(code));
  }

  return data as T;
}
