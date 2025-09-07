// File: src/components/LowMastery.jsx
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

async function markRead(wordId) {
  const r = await fetch(`${API_BASE_URL}/words/mark-read/`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ word_id: wordId }),
  });
  if (!r.ok) throw new Error("mark-read failed");
  return r.json();
}

export default function LowMastery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);
  const [toast, setToast] = useState(null);

  const load = () => {
    setLoading(true);
    
    fetch(`${API_BASE_URL}/user/low_mastery/?max=0`)
      .then(r => r.json())
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const add = async (id, word) => {
    try {
      setAddingId(id);
      await markRead(id);
      setToast({type: "success", msg: `${word} added to review`});
    } catch {
      setToast({type: "error", msg: "Unable to add"});
    } finally {
      setAddingId(null);
      setTimeout(() => setToast(null), 1200);
    }
  };

  if (loading) return <div className="p-4">Loading…</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold">Low Mastery</h2>
        <button
          className="px-3 py-1.5 rounded border"
          onClick={load}
        >
          Refresh
        </button>
      </div>

      {!items.length ? (
        <div className="text-slate-600">Nothing here. 🎉</div>
      ) : (
        <ul className="space-y-2">
          {items.map(w => (
            <li key={w.id} className="p-3 border rounded flex items-center gap-3">
              <div className="flex-1">
                
                
              </div>
              <button
                className="px-3 py-1.5 bg-blue-600 text-white rounded disabled:opacity-50"
                disabled={addingId === w.id}
                onClick={() => add(w.id, w.word)}
              >
                {addingId === w.id ? "Adding…" : "Add to Review"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {toast && (
        <div className={`fixed bottom-4 right-4 px-3 py-2 rounded text-white ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
