import { useEffect, useMemo, useState } from "react";
import { getData, postLog, deleteLogs, undoLastLog, initializeApi, isApiInitialized } from "./api";
import { getHighAccuracyPosition } from "./geolocate";
import type { Building, LogRow } from "./types";
import BuildingRow from "./components/BuildingRow";
import AdminTools from "./components/AdminTools";
import LoginScreen from "./components/LoginScreen";
import InstallPrompt from "./components/InstallPrompt";
import buildingsData from "./buildings.json";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customBuildingName, setCustomBuildingName] = useState("");
  const [customUnderConstruction, setCustomUnderConstruction] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [currentUsername, setCurrentUsername] = useState("anon");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Check if already authenticated on mount
  useEffect(() => {
    if (isApiInitialized()) {
      setIsAuthenticated(true);
      // Restore username from session storage
      const savedUsername = sessionStorage.getItem('username');
      setCurrentUsername(savedUsername || "anon");
      refresh();
    } else {
      setLoading(false);
    }
  }, []);

  // Handle online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync queued logs when coming back online
      syncQueuedLogs();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync queued logs when back online
  async function syncQueuedLogs() {
    const queuedLogs = JSON.parse(localStorage.getItem('queuedLogs') || '[]');
    if (queuedLogs.length === 0) return;

    let syncedCount = 0;
    for (const logData of queuedLogs) {
      try {
        await postLog(logData);
        syncedCount++;
      } catch (error) {
        console.warn('Failed to sync log:', error);
        break; // Stop on first failure to preserve order
      }
    }

    if (syncedCount > 0) {
      // Remove synced logs from queue
      const remainingLogs = queuedLogs.slice(syncedCount);
      localStorage.setItem('queuedLogs', JSON.stringify(remainingLogs));
      
      setToast({
        message: `🔄 Synced ${syncedCount} offline log${syncedCount !== 1 ? 's' : ''} to Google Sheets`,
        type: 'success',
      });

      // Refresh to get latest data
      refresh();
    }
  }

  // Show install prompt after user has been using the app
  useEffect(() => {
    if (isAuthenticated && logs.length >= 3) {
      const hasSeenPrompt = localStorage.getItem('hasSeenInstallPrompt');
      if (!hasSeenPrompt) {
        setTimeout(() => {
          setShowInstallPrompt(true);
          localStorage.setItem('hasSeenInstallPrompt', 'true');
        }, 2000);
      }
    }
  }, [isAuthenticated, logs.length]);

  const handleLogin = (password: string, username: string): boolean => {
    const success = initializeApi(password);
    if (success) {
      setIsAuthenticated(true);
      setCurrentUsername(username || "anon");
      refresh();
      // Store authentication state and username in session
      sessionStorage.setItem('auth', 'true');
      sessionStorage.setItem('username', username || "anon");
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
      // Cache data locally for offline use
      localStorage.setItem('cachedBuildings', JSON.stringify(data.buildings));
      localStorage.setItem('cachedLogs', JSON.stringify(data.logs));
    } catch (err) {
      console.warn('Failed to load from API, using local/cached data:', err);
      
      // Try to load cached data first, then fall back to default buildings
      const cachedBuildings = localStorage.getItem('cachedBuildings');
      const cachedLogs = localStorage.getItem('cachedLogs');
      
      if (cachedBuildings && cachedLogs) {
        setBuildings(JSON.parse(cachedBuildings));
        setLogs(JSON.parse(cachedLogs));
        setError('Using cached data - connect to internet to sync latest changes');
      } else {
        setBuildings(buildingsData as Building[]);
        setLogs([]);
        setError('Offline mode - showing default buildings only');
      }
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
  
  const constructionSet = useMemo(() => 
    new Set(logs.filter(l => l.underConstruction).map(l => l.buildingId)), 
    [logs]
  );

  // Calculate progress percentage
  const progress = useMemo(() => {
    if (buildings.length === 0) return 0;
    const completedBuildings = buildings.filter(b => doneSet.has(b.id)).length;
    return Math.round((completedBuildings / buildings.length) * 100);
  }, [buildings, doneSet]);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return buildings.filter(b => 
      b.name.toLowerCase().includes(needle) || 
      b.id.toLowerCase().includes(needle)
    );
  }, [q, buildings]);

  async function handleLog(b: Building, entrance: number, underConstruction: boolean = false) {
    try {
      const pos = await getHighAccuracyPosition();
      const logData = {
        buildingId: b.id,
        buildingName: b.name,
        entrance,
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy,
        userId: currentUsername,
        underConstruction,
      };

      // optimistic UI: synthesize a log row so status flips to Done immediately
      const newRow: LogRow = {
        timestamp: new Date().toISOString(),
        userId: currentUsername,
        buildingId: b.id,
        buildingName: b.name,
        entrance,
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy,
        underConstruction
      };
      setLogs(prev => [newRow, ...prev]);

      try {
        // Try to send to server
        await postLog(logData);
        
        const constructionText = underConstruction ? " (🚧 Under Construction)" : "";
        const accuracyText = pos.accuracy <= 10 ? "📍" : pos.accuracy <= 50 ? "📌" : "📍⚠️";
        setToast({
          message: `${accuracyText} Successfully logged ${b.name} entrance ${entrance}${constructionText}! (±${pos.accuracy.toFixed(1)}m)`,
          type: 'success',
        });
      } catch (apiError) {
        // If offline, queue for later sync
        const queuedLogs = JSON.parse(localStorage.getItem('queuedLogs') || '[]');
        queuedLogs.push({ ...logData, timestamp: newRow.timestamp });
        localStorage.setItem('queuedLogs', JSON.stringify(queuedLogs));
        
        const constructionText = underConstruction ? " (🚧 Under Construction)" : "";
        const accuracyText = pos.accuracy <= 10 ? "📍" : pos.accuracy <= 50 ? "📌" : "📍⚠️";
        setToast({
          message: `${accuracyText} Logged ${b.name} entrance ${entrance}${constructionText} offline (±${pos.accuracy.toFixed(1)}m) - will sync when online`,
          type: 'success',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to log location';
      setToast({
        message,
        type: 'error',
      });
    }
  }

  async function handleCustomBuildingLog(entrance: number, underConstruction: boolean = false) {
    if (!customBuildingName.trim()) {
      setToast({
        message: 'Please enter a building name',
        type: 'error',
      });
      return;
    }

    // Generate a simple ID from the name
    const customId = `custom-${customBuildingName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    
    const customBuilding: Building = {
      id: customId,
      name: customBuildingName.trim(),
      entrancesMax: 5
    };

    try {
      const pos = await getHighAccuracyPosition();
      await postLog({
        buildingId: customBuilding.id,
        buildingName: customBuilding.name,
        entrance,
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy,
        userId: currentUsername,
        underConstruction,
      });
      
      // optimistic UI: synthesize a log row so status flips to Done immediately
      const newRow: LogRow = {
        timestamp: new Date().toISOString(),
        userId: currentUsername,
        buildingId: customBuilding.id,
        buildingName: customBuilding.name,
        entrance,
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy,
        underConstruction
      };
      setLogs(prev => [newRow, ...prev]);

      const constructionText = underConstruction ? " (🚧 Under Construction)" : "";
      const accuracyText = pos.accuracy <= 10 ? "📍" : pos.accuracy <= 50 ? "📌" : "📍⚠️";
      setToast({
        message: `${accuracyText} Successfully logged ${customBuilding.name} entrance ${entrance}${constructionText}! (±${pos.accuracy.toFixed(1)}m)`,
        type: 'success',
      });

      // Close modal and reset form
      setShowCustomModal(false);
      setCustomBuildingName("");
      setCustomUnderConstruction(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to log location';
      setToast({
        message,
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
      const result = await undoLastLog(currentUsername);
      await refresh();
      setToast({
        message: `Successfully undid your last log (${result.deletedCount} entry deleted)`,
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
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-4 left-4 z-50 bg-orange-100 text-orange-800 px-4 py-2 rounded-md shadow-lg border border-orange-200">
          <div className="flex items-center gap-2">
            <span className="text-sm">📡</span>
            <span className="text-sm font-medium">Offline Mode</span>
          </div>
        </div>
      )}

      {/* Pending sync indicator */}
      {(() => {
        const queuedLogs = JSON.parse(localStorage.getItem('queuedLogs') || '[]');
        return queuedLogs.length > 0 && (
          <div className="fixed top-4 left-4 z-50 bg-blue-100 text-blue-800 px-3 py-2 rounded-md shadow-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔄</span>
              <span className="text-sm font-medium">{queuedLogs.length} log{queuedLogs.length !== 1 ? 's' : ''} pending sync</span>
            </div>
          </div>
        );
      })()}

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
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {currentUsername}
          </span>
          <button
            onClick={() => {
              setIsAuthenticated(false);
              setCurrentUsername("anon");
              sessionStorage.removeItem('auth');
              sessionStorage.removeItem('username');
            }}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
          <span>Overall Progress</span>
          <span>{progress}% ({doneSet.size}/{buildings.length} buildings)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ease-out ${
              progress === 100 ? 'bg-green-500' : progress >= 75 ? 'bg-blue-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        {progress === 100 && (
          <div className="text-center text-green-600 font-semibold mt-1 text-sm">
            🎉 All buildings logged!
          </div>
        )}
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

      <div className="flex items-center gap-2 mb-3">
        <button 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex-1"
          onClick={() => setShowCustomModal(true)}
        >
          + Add Custom Building
        </button>
      </div>

      {/* Buildings List with Scrollable Container */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">
            Buildings ({filtered.length}{buildings.length !== filtered.length ? ` of ${buildings.length}` : ""})
          </h2>
        </div>
        
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg bg-white shadow-sm scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="space-y-0">
            {filtered.map(b => (
              <BuildingRow
                key={b.id}
                building={b}
                isDone={doneSet.has(b.id)}
                hasConstruction={constructionSet.has(b.id)}
                onLog={(entr, underConstruction) => handleLog(b, entr, underConstruction)}
                entrancesMax={b.entrancesMax ?? 5}
              />
            ))}
            
            {filtered.length === 0 && (
              <div className="text-center py-8 text-gray-500 px-4">
                <p>No buildings found matching "{q}"</p>
                <p className="text-sm mt-1">Try a different search term or add a custom building</p>
              </div>
            )}
            
            {/* Scroll indicator at bottom */}
            {filtered.length > 10 && (
              <div className="text-center py-3 text-xs text-gray-400 border-t border-gray-100 bg-gray-50">
                📜 {filtered.length} buildings total • Scroll for more
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Tools */}
      <div className="mt-8 border-t pt-4">
        <h2 className="font-semibold mb-2">Admin Tools</h2>
        <AdminTools 
          buildings={buildings} 
          onDeleteEntrance={removeForEntrance}
          onUndoLast={handleUndoLast}
        />
        <p className="text-xs text-gray-500 mt-2">
          Note: Status is derived from logs. Deleting logs reverts status to Pending on next refresh.
        </p>
      </div>

      {/* Custom Building Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Add Custom Building</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Building Name</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                placeholder="Enter building name..."
                value={customBuildingName}
                onChange={(e) => setCustomBuildingName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && customBuildingName.trim() && handleCustomBuildingLog(1, customUnderConstruction)}
              />
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={customUnderConstruction}
                  onChange={(e) => setCustomUnderConstruction(e.target.checked)}
                  className="rounded"
                />
                <span className={customUnderConstruction ? "text-orange-600 font-medium" : "text-gray-600"}>
                  🚧 Under Construction
                </span>
              </label>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select Entrance (Max: 5)</label>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 5 }, (_, i) => i + 1).map(entrance => (
                  <button
                    key={entrance}
                    className={`text-white px-3 py-2 rounded hover:opacity-90 disabled:opacity-50 ${
                      customUnderConstruction ? 'bg-orange-500' : 'bg-green-500'
                    }`}
                    onClick={() => handleCustomBuildingLog(entrance, customUnderConstruction)}
                    disabled={!customBuildingName.trim()}
                  >
                    {entrance}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                className="flex-1 border border-gray-300 px-4 py-2 rounded hover:bg-gray-50"
                onClick={() => {
                  setShowCustomModal(false);
                  setCustomBuildingName("");
                  setCustomUnderConstruction(false);
                }}
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Custom buildings will have a maximum of 5 entrances and will be automatically added to your logs.
            </p>
          </div>
        </div>
      )}

      {/* Install Prompt */}
      {showInstallPrompt && (
        <InstallPrompt onClose={() => setShowInstallPrompt(false)} />
      )}
    </div>
  );
}
