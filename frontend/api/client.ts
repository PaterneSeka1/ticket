const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, payload: unknown) {
    const hasMessage =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof (payload as Record<string, unknown>).message === "string";
    const message = hasMessage
      ? ((payload as Record<string, unknown>).message as string)
      : undefined;

    super(message ?? "Une erreur est survenue lors de la requête API.");
    this.status = status;
    this.payload = payload;
  }
}

interface ApiRequestOptions extends RequestInit {
  auth?: boolean;
}

function getToken(): string | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  return sessionStorage.getItem("vdm_access_token");
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const initHeaders: Record<string, string> = {};
  if (!(rest.body instanceof FormData)) {
    initHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) {
      initHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...initHeaders,
      ...headers,
    },
    ...rest,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(response.status, data);
  }

  return data as T;
}
