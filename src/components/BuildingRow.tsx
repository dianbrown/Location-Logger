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
    <div className="flex items-center justify-between gap-3 border-b py-2">
      <div className="flex-1">
        <div className="font-medium flex items-center gap-2">
          {building.name}
          {hasConstruction && <span className="text-orange-600 text-sm">🚧</span>}
        </div>
        <div className="text-xs text-gray-500 mb-1">{building.id}</div>
        <StatusPill done={isDone} />
      </div>
      
      <div className="flex items-center gap-2">
        <select
          value={entrance}
          onChange={(e) => setEntrance(Number(e.target.value))}
          className="border rounded px-2 py-1"
          aria-label="Entrance"
        >
          {Array.from({ length: max }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>Entrance {n}</option>
          ))}
        </select>
        
        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={underConstruction}
            onChange={(e) => setUnderConstruction(e.target.checked)}
            className="rounded"
          />
          <span className={underConstruction ? "text-orange-600 font-medium" : "text-gray-600"}>
            🚧 Construction
          </span>
        </label>
        
        <button
          className={`rounded text-white px-3 py-1 disabled:opacity-60 ${
            underConstruction ? 'bg-orange-500 hover:bg-orange-600' : 'bg-black hover:bg-gray-800'
          }`}
          disabled={loading}
          onClick={handleLog}
        >
          {loading ? "Logging..." : "Log"}
        </button>
      </div>
    </div>
  );
}
