import { useState } from "react";
import type { Building } from "../types";

interface AdminToolsProps {
  buildings: Building[];
  onDeleteAll: (id: string) => Promise<void>;
  onDeleteEntrance: (id: string, entrance: number) => Promise<void>;
  onUndoLast: () => Promise<void>;
}

export default function AdminTools({
  buildings, 
  onDeleteAll, 
  onDeleteEntrance,
  onUndoLast
}: AdminToolsProps) {
  const [sel, setSel] = useState("");
  const [entr, setEntr] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleDeleteAll = async () => {
    if (!sel) return;
    setLoading(true);
    try {
      await onDeleteAll(sel);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntrance = async () => {
    if (!sel) return;
    setLoading(true);
    try {
      await onDeleteEntrance(sel, entr);
    } finally {
      setLoading(false);
    }
  };

  const handleUndoLast = async () => {
    setLoading(true);
    try {
      await onUndoLast();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Undo Last Log */}
      <div className="flex items-center gap-2">
        <button 
          className="bg-orange-500 text-white rounded px-3 py-1 disabled:opacity-60 hover:bg-orange-600" 
          disabled={loading} 
          onClick={handleUndoLast}
        >
          {loading ? "Undoing..." : "↩️ Undo Last Log"}
        </button>
        <span className="text-xs text-gray-500">Removes the most recent log entry</span>
      </div>

      {/* Building-specific deletions */}
      <div className="flex items-center gap-2 flex-wrap">
        <select 
          className="border rounded px-2 py-1" 
          value={sel} 
          onChange={e => setSel(e.target.value)}
        >
          <option value="">Select building…</option>
          {buildings.map(b => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.id})
            </option>
          ))}
        </select>
        
        <button 
          className="border rounded px-3 py-1 disabled:opacity-60" 
          disabled={!sel || loading} 
          onClick={handleDeleteAll}
        >
          {loading ? "Deleting..." : "Delete ALL logs"}
        </button>
        
        <input 
          type="number" 
          min={1} 
          className="border rounded px-2 py-1 w-24" 
          value={entr} 
          onChange={e => setEntr(Number(e.target.value) || 1)} 
        />
        
        <button 
          className="border rounded px-3 py-1 disabled:opacity-60" 
          disabled={!sel || loading} 
          onClick={handleDeleteEntrance}
        >
          {loading ? "Deleting..." : "Delete by entrance"}
        </button>
      </div>
    </div>
  );
}
