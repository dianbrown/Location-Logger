import { useState } from "react";
import StatusPill from "./StatusPill";
import type { Building } from "../types";

interface BuildingRowProps {
  building: Building;
  isDone: boolean;
  hasConstruction?: boolean;
  onLog: (entrance: number, underConstruction: boolean) => Promise<void>;
  entrancesMax?: number;
}

export default function BuildingRow({
  building, 
  isDone, 
  hasConstruction = false,
  onLog, 
  entrancesMax = 5
}: BuildingRowProps) {
  const max = building.entrancesMax ?? entrancesMax;
  const [entrance, setEntrance] = useState(1);
  const [underConstruction, setUnderConstruction] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLog = async () => {
    setLoading(true);
    try { 
      await onLog(entrance, underConstruction); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="border-b py-4">
      {/* Building name and status - centered at top */}
      <div className="text-center mb-3">
        <div className="font-medium text-lg flex items-center justify-center gap-2">
          {building.name}
          {hasConstruction && <span className="text-orange-600 text-sm">🚧</span>}
        </div>
        <div className="text-xs text-gray-500 mb-2">{building.id}</div>
        <StatusPill done={isDone} />
      </div>
      
      {/* Controls - stacked vertically on mobile, horizontal on larger screens */}
      <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-center sm:gap-4">
        {/* Entrance selection */}
        <div className="flex items-center justify-center gap-2">
          <label className="text-sm font-medium text-gray-700">Entrance:</label>
          <select
            value={entrance}
            onChange={(e) => setEntrance(Number(e.target.value))}
            className="border rounded px-3 py-1.5 text-sm min-w-[120px]"
            aria-label="Entrance"
          >
            {Array.from({ length: max }, (_, i) => i + 1).map(n => (
              <option key={n} value={n}>Entrance {n}</option>
            ))}
          </select>
        </div>
        
        {/* Construction checkbox */}
        <div className="flex items-center justify-center">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={underConstruction}
              onChange={(e) => setUnderConstruction(e.target.checked)}
              className="rounded"
            />
            <span className={underConstruction ? "text-orange-600 font-medium" : "text-gray-600"}>
              🚧 Under Construction
            </span>
          </label>
        </div>
        
        {/* Log button - full width on mobile */}
        <div className="flex justify-center">
          <button
            className={`rounded text-white px-6 py-2 font-medium disabled:opacity-60 w-full sm:w-auto ${
              underConstruction ? 'bg-orange-500 hover:bg-orange-600' : 'bg-black hover:bg-gray-800'
            }`}
            disabled={loading}
            onClick={handleLog}
          >
            {loading ? "Logging..." : "📍 Log Location"}
          </button>
        </div>
      </div>
    </div>
  );
}
