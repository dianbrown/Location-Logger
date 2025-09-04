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

export async function getData() {
  // For GET requests, we don't need credentials - try direct access
  const endpoint = import.meta.env.VITE_SHEETS_ENDPOINT;
  const url = `${endpoint}?mode=data`;
  
  console.log('🔍 API Debug Info:');
  console.log('- Endpoint:', endpoint);
  console.log('- Full URL:', url);
  
  try {
    const res = await fetch(url, { 
      method: 'GET',
      mode: 'cors'
    });
    console.log('- Response status:', res.status);
    console.log('- Response OK:', res.ok);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.log('- Error response:', errorText);
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
    
    const data = await res.json();
    console.log('- Buildings loaded:', data.buildings?.length || 0);
    console.log('- Logs loaded:', data.logs?.length || 0);
    return data as ApiPayload;
  } catch (error) {
    console.error('❌ API Error:', error);
    throw error;
  }
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
  underConstruction?: boolean;
}) {
  const endpoint = import.meta.env.VITE_SHEETS_ENDPOINT;
  
  // Use URL parameters instead of POST body to avoid CORS preflight
  const params = new URLSearchParams({
    mode: 'log',
    buildingId: payload.buildingId,
    buildingName: payload.buildingName,
    entrance: payload.entrance.toString(),
    lat: payload.lat.toString(),
    lng: payload.lng.toString(),
    accuracy: payload.accuracy.toString(),
    userId: payload.userId || 'anon',
    underConstruction: payload.underConstruction ? 'true' : 'false'
  });
  
  const url = `${endpoint}?${params.toString()}`;
  
  console.log('🔍 POST Log Debug:');
  console.log('- URL:', url);
  
  try {
    const res = await fetch(url, {
      method: "GET", // Use GET to avoid preflight
      mode: 'cors'
    });
    
    console.log('- POST Response status:', res.status);
    console.log('- POST Response OK:', res.ok);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.log('- POST Error response:', errorText);
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
    
    return await res.json() as { ok: true };
  } catch (error) {
    console.error('❌ POST Error:', error);
    throw error;
  }
}

// Delete logs for a building (optionally entrance)
export async function deleteLogs(opts: { buildingId: string; entrance?: number; latest?: boolean }) {
  const endpoint = import.meta.env.VITE_SHEETS_ENDPOINT;
  
  const params = new URLSearchParams({
    mode: 'delete',
    buildingId: opts.buildingId,
    ...(opts.entrance !== undefined && { entrance: opts.entrance.toString() }),
    ...(opts.latest && { latest: 'true' })
  });
  
  const url = `${endpoint}?${params.toString()}`;
  
  try {
    const res = await fetch(url, {
      method: "GET",
      mode: 'cors'
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
    
    return await res.json() as { ok: true; deletedCount: number };
  } catch (error) {
    console.error('❌ Delete Error:', error);
    throw error;
  }
}

// Undo the last log entry
export async function undoLastLog() {
  const endpoint = import.meta.env.VITE_SHEETS_ENDPOINT;
  
  const params = new URLSearchParams({
    mode: 'delete',
    undoLast: 'true'
  });
  
  const url = `${endpoint}?${params.toString()}`;
  
  try {
    const res = await fetch(url, {
      method: "GET",
      mode: 'cors'
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }
    
    return await res.json() as { ok: true; deletedCount: number };
  } catch (error) {
    console.error('❌ Undo Error:', error);
    throw error;
  }
}
