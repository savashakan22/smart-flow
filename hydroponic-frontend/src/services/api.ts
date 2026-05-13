export type LatestReadingResponse = {
  device_id: string;
  timestamp: string;
  ec?: number | null;
  air_temp?: number | null;
  humidity?: number | null;
  water_level?: number | null;
  water_temp?: number | null;
  light?: number | null;
};

export type HistoryRow = {
  timestamp: string;
  ec?: number;
  air_temp?: number;
  humidity?: number;
  water_level?: number;
  water_temp?: number;
  light?: number;
};

export type HistoryResponse = {
  device_id: string;
  start: string;
  end: string;
  count: number;
  data: HistoryRow[];
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const pendingGetRequests = new Map<string, Promise<unknown>>();

async function apiRequest<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const method = init.method ?? "GET";
  const canShareRequest = method.toUpperCase() === "GET";
  const requestKey = `${token ?? ""}:${path}`;

  if (canShareRequest && pendingGetRequests.has(requestKey)) {
    return pendingGetRequests.get(requestKey) as Promise<T>;
  }

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const request = fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  }).then(async (response) => {
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        detail = body.detail ?? detail;
      } catch {
        // no-op
      }
      throw new Error(detail);
    }

    return response.json() as Promise<T>;
  });

  if (canShareRequest) {
    pendingGetRequests.set(requestKey, request);
    try {
      return await request;
    } finally {
      pendingGetRequests.delete(requestKey);
    }
  }

  return request;
}

export async function fetchDevices(token: string) {
  return apiRequest<{ devices: string[] }>("/devices", {}, token);
}

export async function claimDevice(claimCode: string, token: string) {
  return apiRequest<{ success: boolean; detail?: string; device_id?: string }>(
    "/devices/claim",
    {
      method: "POST",
      body: JSON.stringify({ claim_code: claimCode }),
    },
    token
  );
}

export async function unclaimDevice(deviceId: string, token: string) {
  return apiRequest<{
    success: boolean;
    detail?: string;
    device_id?: string;
    claim_reopened?: boolean;
  }>(
    `/devices/${encodeURIComponent(deviceId)}/unclaim`,
    {
      method: "POST",
    },
    token
  );
}

export async function fetchLatestReading(deviceId: string, token: string) {
  return apiRequest<LatestReadingResponse>(`/sensors/${encodeURIComponent(deviceId)}`, {}, token);
}

export async function fetchHistory(deviceId: string, token: string, start?: string, end?: string) {
  const query = new URLSearchParams();
  if (start) query.set("start", start);
  if (end) query.set("end", end);

  const suffix = query.toString() ? `?${query.toString()}` : "";

  return apiRequest<HistoryResponse>(
    `/sensors/${encodeURIComponent(deviceId)}/history${suffix}`,
    {},
    token
  );
}
