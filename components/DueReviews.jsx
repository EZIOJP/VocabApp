// File: src/components/DueReviews.jsx
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

export default function DueReviews({ onStartQuiz }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/reviews/due/?limit=30`)
      .then(r => r.json())
      .then(d => setItems(d.results || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4">Loading due reviews…</div>;
  if (!items.length) return <div className="p-4">🎉 Nothing due</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-3">Due Reviews ({items.length})</h2>
      <ul className="space-y-2">
        {items.map(p => (
          <li key={p.id} className="border rounded p-2">
            <div className="font-semibold">{p.word}</div>
            <div className="text-sm text-slate-600">
              mastery {p.mastery} • reps {p.repetitions}
            </div>
          </li>
        ))}
      </ul>
      <button
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        onClick={() => onStartQuiz(items.map(i => i.word))}
      >
        Start SR Quiz
      </button>
    </div>
  );
}
