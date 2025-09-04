import { useState } from "react";
import StatusPill from "./StatusPill";
import type { Building } from "../types";

interface BuildingRowProps {
  building: Building;
  isDone: boolean;
  onLog: (entrance: number) => Promise<void>;
  entrancesMax?: number;
}

export default function BuildingRow({
  building, 
  isDone, 
  onLog, 
  entrancesMax = 5
}: BuildingRowProps) {
  const max = building.entrancesMax ?? entrancesMax;
  const [entrance, setEntrance] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleLog = async () => {
    setLoading(true);
    try { 
      await onLog(entrance); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 border-b py-2">
      <div className="flex-1">
        <div className="font-medium">{building.name}</div>
        <div className="text-xs text-gray-500 mb-1">{building.id}</div>
        <StatusPill done={isDone} />
      </div>
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
      <button
        className="rounded bg-black text-white px-3 py-1 disabled:opacity-60"
        disabled={loading}
        onClick={handleLog}
      >
        {loading ? "Logging..." : "Log"}
      </button>
    </div>
  );
}
