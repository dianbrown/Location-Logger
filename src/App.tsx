import { useEffect, useMemo, useState } from "react";
import { getData, postLog, deleteLogs, undoLastLog, initializeApi, isApiInitialized } from "./api";
import { getCurrentPosition } from "./geolocate";
import type { Building, LogRow } from "./types";
import BuildingRow from "./components/BuildingRow";
import AdminTools from "./components/AdminTools";
import LoginScreen from "./components/LoginScreen";
import buildingsData from "./buildings.json";

function uid() {
  const k = "uid";
  let v = localStorage.getItem(k);
  if (!v) { 
    v = crypto.randomUUID?.() || String(Date.now()); 
    localStorage.setItem(k, v); 
  }
  return v;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Check if already authenticated on mount
  useEffect(() => {
    if (isApiInitialized()) {
      setIsAuthenticated(true);
      refresh();
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = (password: string): boolean => {
    const success = initializeApi(password);
    if (success) {
      setIsAuthenticated(true);
      refresh();
      // Store authentication state in session
      sessionStorage.setItem('auth', 'true');
    }
    return success;
  };

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await getData();
      setBuildings(data.buildings);
      setLogs(data.logs);
    } catch (err) {
      console.warn('Failed to load from API, using local data:', err);
      setBuildings(buildingsData as Building[]);
      setLogs([]);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally { 
      setLoading(false); 
    }
  }

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const doneSet = useMemo(() => new Set(logs.map(l => l.buildingId)), [logs]);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return buildings.filter(b => 
      b.name.toLowerCase().includes(needle) || 
      b.id.toLowerCase().includes(needle)
    );
  }, [q, buildings]);

  async function handleLog(b: Building, entrance: number) {
    try {
      const pos = await getCurrentPosition();
      await postLog({
        buildingId: b.id,
        buildingName: b.name,
        entrance,
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy,
        userId: uid(),
      });
      
      // optimistic UI: synthesize a log row so status flips to Done immediately
      const newRow: LogRow = {
        timestamp: new Date().toISOString(),
        userId: uid(),
        buildingId: b.id,
        buildingName: b.name,
        entrance,
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy
      };
      setLogs(prev => [newRow, ...prev]);

      setToast({
        message: `Successfully logged ${b.name} entrance ${entrance}!`,
        type: 'success',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to log location';
      setToast({
        message,
        type: 'error',
      });
    }
  }

  async function removeAllForBuilding(buildingId: string) {
    try {
      await deleteLogs({ buildingId });
      await refresh();
      setToast({
        message: 'Successfully deleted all logs for building',
        type: 'success',
      });
    } catch (err) {
      setToast({
        message: 'Failed to delete logs',
        type: 'error',
      });
    }
  }

  async function removeForEntrance(buildingId: string, entrance: number) {
    try {
      await deleteLogs({ buildingId, entrance });
      await refresh();
      setToast({
        message: `Successfully deleted logs for entrance ${entrance}`,
        type: 'success',
      });
    } catch (err) {
      setToast({
        message: 'Failed to delete logs',
        type: 'error',
      });
    }
  }

  async function handleUndoLast() {
    try {
      const result = await undoLastLog();
      await refresh();
      setToast({
        message: `Successfully undid last log (${result.deletedCount} entry deleted)`,
        type: 'success',
      });
    } catch (err) {
      setToast({
        message: 'Failed to undo last log',
        type: 'error',
      });
    }
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 text-center">
        <div>Loading…</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg ${
          toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className="flex items-center">
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-4 text-lg font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">Campus Entrance Logger</h1>
        <button
          onClick={() => {
            setIsAuthenticated(false);
            sessionStorage.removeItem('auth');
          }}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          🔒 Logout
        </button>
      </div>
      
      {error && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          <p>⚠️ Working in offline mode: {error}</p>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <input 
          className="border rounded px-3 py-2 w-full" 
          placeholder="Search building..."
          value={q} 
          onChange={e => setQ(e.target.value)} 
        />
        <button 
          className="border rounded px-3 py-2" 
          onClick={refresh}
        >
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map(b => (
          <BuildingRow
            key={b.id}
            building={b}
            isDone={doneSet.has(b.id)}
            onLog={(entr) => handleLog(b, entr)}
            entrancesMax={b.entrancesMax ?? 5}
          />
        ))}
      </div>

      {/* Admin Tools */}
      <div className="mt-8 border-t pt-4">
        <h2 className="font-semibold mb-2">Admin Tools</h2>
        <AdminTools 
          buildings={buildings} 
          onDeleteAll={removeAllForBuilding} 
          onDeleteEntrance={removeForEntrance}
          onUndoLast={handleUndoLast}
        />
        <p className="text-xs text-gray-500 mt-2">
          Note: Status is derived from logs. Deleting logs reverts status to Pending on next refresh.
        </p>
      </div>
    </div>
  );
}
