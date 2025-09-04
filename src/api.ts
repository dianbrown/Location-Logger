import type { ApiPayload } from './types';

// Only access API credentials after password verification
let apiCredentials: { endpoint: string; apiKey: string } | null = null;

export const initializeApi = (password: string): boolean => {
  const correctPassword = import.meta.env.VITE_TEAM_PASSWORD;
  if (password !== correctPassword) {
    return false;
  }
  
  apiCredentials = {
    endpoint: import.meta.env.VITE_SHEETS_ENDPOINT,
    apiKey: import.meta.env.VITE_SHEETS_API_KEY
  };
  return true;
};

export const isApiInitialized = (): boolean => {
  return apiCredentials !== null;
};

function getApiCredentials() {
  if (!apiCredentials) {
    throw new Error('API not initialized. Please enter team password first.');
  }
  return apiCredentials;
}

async function request<T>(path = "", init: RequestInit = {}): Promise<T> {
  const { endpoint, apiKey } = getApiCredentials();
  const res = await fetch(`${endpoint}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
      ...(init.headers || {})
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getData() {
  const { endpoint, apiKey } = getApiCredentials();
  const url = `${endpoint}?mode=data`;
  const res = await fetch(url, { headers: { "X-API-KEY": apiKey } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as ApiPayload;
}

// Create a log row
export async function postLog(payload: {
  buildingId: string;
  buildingName: string;
  entrance: number;
  lat: number;
  lng: number;
  accuracy: number;
  userId?: string;
}) {
  return request<{ ok: true }>("", { method: "POST", body: JSON.stringify(payload) });
}

// Delete logs for a building (optionally entrance)
export async function deleteLogs(opts: { buildingId: string; entrance?: number; latest?: boolean }) {
  // Method-override delete via POST (works with classic Apps Script)
  return request<{ ok: true; deletedCount: number }>("?_method=DELETE", {
    method: "POST",
    body: JSON.stringify(opts)
  });
}

// Undo the last log entry
export async function undoLastLog() {
  return request<{ ok: true; deletedCount: number }>("?_method=DELETE", {
    method: "POST",
    body: JSON.stringify({ undoLast: true })
  });
}
