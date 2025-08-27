// File: src/components/ReadMode.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

// ---------- small helpers ----------
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const LS_INDEX_KEY = "readmode:index";
const LS_HIDE_TOGGLE_KEY = "readmode:hideAdded";
const LS_HIDDEN_IDS_KEY = "readmode:hiddenIds";

export default function ReadMode() {
  const [allWords, setAllWords] = useState([]);
  const [index, setIndex] = useState(0);
  const [hideAfterAdd, setHideAfterAdd] = useState(() => {
    try {
      return localStorage.getItem(LS_HIDE_TOGGLE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [hiddenIds, setHiddenIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(LS_HIDDEN_IDS_KEY) || "[]"));
    } catch {
      return new Set();
    }
  });
  const [toast, setToast] = useState(null);
  const [adding, setAdding] = useState(false);
  const [alreadyAdded, setAlreadyAdded] = useState(false);

  // ---- API helpers ----
  async function markRead(wordId) {
    const r = await fetch(`${API_BASE_URL}/words/mark-read/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word_id: wordId }),
    });
    if (!r.ok) throw new Error("mark-read failed");
    return r.json();
  }

  async function hasProgress(wordId) {
    // Simple client-side check: fetch the user's progress list and see if this word is present.
    // (Server returns only the current user's progress; unauth users use 'demo' under the hood.)
    try {
      const r = await fetch(`${API_BASE_URL}/userwordprogress/`);
      if (!r.ok) return false;
      const list = await r.json();
      // list is an array of { ..., word: <id> }
      return Array.isArray(list) && list.some((p) => p.word === wordId);
    } catch {
      return false;
    }
  }

  // fetch + shuffle once (with abort safety)
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/words/`, { signal: ctrl.signal });
        const data = await r.json();
        const shuffled = shuffle(data || []);
        setAllWords(shuffled);

        // restore last index safely
        const saved = parseInt(localStorage.getItem(LS_INDEX_KEY) || "0", 10);
        if (!Number.isNaN(saved)) {
          setIndex(clamp(saved, 0, Math.max(0, shuffled.length - 1)));
        }
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error("ReadMode fetch error:", e);
        }
      }
    })();
    return () => ctrl.abort();
  }, []);

  // persist index
  useEffect(() => {
    try {
      localStorage.setItem(LS_INDEX_KEY, String(index));
    } catch {}
  }, [index]);

  // persist hide toggle
  useEffect(() => {
    try {
      localStorage.setItem(LS_HIDE_TOGGLE_KEY, hideAfterAdd ? "1" : "0");
    } catch {}
  }, [hideAfterAdd]);

  // compute visible words when hiding enabled
  const visibleWords = useMemo(() => {
    if (!hideAfterAdd) return allWords;
    return allWords.filter((w) => !hiddenIds.has(w.id));
  }, [allWords, hideAfterAdd, hiddenIds]);

  // keep index in range whenever visible list changes
  useEffect(() => {
    if (!visibleWords.length) return;
    setIndex((p) => clamp(p, 0, visibleWords.length - 1));
  }, [visibleWords.length]);

  // Navigation helpers
  const goPrev = useCallback(
    () => setIndex((p) => clamp(p - 1, 0, Math.max(0, visibleWords.length - 1))),
    [visibleWords.length]
  );
  const goNext = useCallback(
    () => setIndex((p) => clamp(p + 1, 0, Math.max(0, visibleWords.length - 1))),
    [visibleWords.length]
  );

  // keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  const persistHiddenIds = (setVal) => {
    try {
      localStorage.setItem(LS_HIDDEN_IDS_KEY, JSON.stringify([...setVal]));
    } catch {}
  };

  const safeIndex = visibleWords.length
    ? clamp(index, 0, visibleWords.length - 1)
    : 0;

  const word = visibleWords.length ? visibleWords[safeIndex] : {};

  // Check if current word is already in review (progress exists)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (word && word.id) {
        const yes = await hasProgress(word.id);
        if (!cancelled) setAlreadyAdded(!!yes);
      } else {
        if (!cancelled) setAlreadyAdded(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [word?.id]);

  const handleAddToReview = async () => {
    if (!word || !word.id) return;
    try {
      setAdding(true);
      await markRead(word.id);
      setAlreadyAdded(true);
      setToast({ type: "success", msg: `${word.word} added to review` });

      if (hideAfterAdd) {
        const next = new Set(hiddenIds);
        next.add(word.id);
        setHiddenIds(next);
        persistHiddenIds(next);
      }

      // jump to next visible item
      requestAnimationFrame(() => {
        if (safeIndex < visibleWords.length - 1) {
          setIndex(safeIndex + 1);
        } else {
          setIndex(clamp(safeIndex, 0, Math.max(0, visibleWords.length - 2)));
        }
      });
    } catch (e) {
      setToast({ type: "error", msg: "Couldn't add to review" });
    } finally {
      setAdding(false);
      setTimeout(() => setToast(null), 1400);
    }
  };

  const isEmpty = visibleWords.length === 0;

  // ---------- UI ----------
  return (
    <div className="w-full mx-auto max-w-6xl p-4 sm:p-8 space-y-6">
      {/* Top bar: title, toggle, position */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Read Mode</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={hideAfterAdd}
              onChange={(e) => setHideAfterAdd(e.target.checked)}
            />
            Hide after "Add to Review"
          </label>
          <button
            className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-600"
            onClick={() => {
              const cleared = new Set();
              setHiddenIds(cleared);
              try {
                localStorage.setItem(LS_HIDDEN_IDS_KEY, "[]");
              } catch {}
            }}
          >
            Reset hidden
          </button>
          <span className="text-sm text-slate-500">
            {visibleWords.length ? safeIndex + 1 : 0} / {visibleWords.length}
          </span>
        </div>
      </div>

      {/* Empty state */}
      {isEmpty ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-slate-700">
            {allWords.length === 0
              ? "Loading words..."
              : "All caught up 🎉 (nothing to show with current filters)"}
          </p>
          <div className="flex gap-3 justify-center mt-4">
            {allWords.length > 0 && hideAfterAdd && (
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white"
                onClick={() => setHideAfterAdd(false)}
              >
                Show all words
              </button>
            )}
            {allWords.length > 0 && (
              <button
                className="px-4 py-2 rounded border border-slate-300 text-slate-700"
                onClick={() => {
                  const cleared = new Set();
                  setHiddenIds(cleared);
                  try {
                    localStorage.setItem(LS_HIDDEN_IDS_KEY, "[]");
                  } catch {}
                }}
              >
                Reset hidden
              </button>
            )}
          </div>
        </div>
      ) : (
        // Main panel
        <div className="relative rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
          {/* ID badge */}
          {word.id != null && (
            <div className="absolute top-4 right-4 rounded-full bg-blue-100 text-blue-800 font-semibold text-xs px-4 py-1 shadow-sm border border-blue-200">
              ID: {word.id}
            </div>
          )}

          {/* Header row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <span className="text-2xl sm:text-3xl font-semibold text-blue-700">
              {typeof word.word === "string" && word.word.length
                ? `${word.word[0].toUpperCase()}${word.word.slice(1)}`
                : "—"}
            </span>
            {word.pronunciation && (
              <span className="text-lg sm:text-xl font-mono text-gray-500">
                ({word.pronunciation})
              </span>
            )}
            {word.connotation && (
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  word.connotation === "positive"
                    ? "bg-green-100 text-green-700"
                    : word.connotation === "negative"
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {word.connotation}
              </span>
            )}
            <button
              onClick={handleAddToReview}
              disabled={adding || alreadyAdded}
              className="ml-auto px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {alreadyAdded ? "In Review ✓" : adding ? "Adding..." : "Add to Review"}
            </button>
          </div>

          {/* Info grid */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Meaning */}
            <div className="bg-slate-50 rounded px-5 py-4 border border-slate-200">
              <div className="text-xs text-slate-600 font-semibold tracking-wide">
                Meaning
              </div>
              <div className="text-slate-900 text-base font-semibold mt-1">
                {word.meaning || <span className="text-gray-400">N/A</span>}
              </div>
            </div>

            {/* Word breakdown */}
            <div className="bg-slate-50 rounded px-5 py-4 border border-slate-200">
              <div className="text-xs text-slate-600 font-semibold tracking-wide">
                Word Breakdown
              </div>
              <div className="mt-2 space-y-1">
                <Row label="Prefix" value={word.word_breakdown?.prefix} />
                <Row label="Root" value={word.word_breakdown?.root} />
                <Row label="Suffix" value={word.word_breakdown?.suffix} />
              </div>
            </div>

            {/* Etymology */}
            <div className="bg-slate-50 rounded px-5 py-4 border border-slate-200">
              <div className="text-xs text-slate-600 font-semibold tracking-wide">
                Etymology
              </div>
              <div className="text-slate-900 text-base mt-1">
                {word.etymology || <span className="text-gray-400">N/A</span>}
              </div>
            </div>

            {/* Story mnemonic */}
            <div className="bg-slate-50 rounded px-5 py-4 border border-slate-200">
              <div className="text-xs text-slate-600 font-semibold tracking-wide">
                Story Mnemonic
              </div>
              <div className="text-slate-900 text-base mt-1">
                {word.story_mnemonic || <span className="text-gray-400">N/A</span>}
              </div>
            </div>
          </div>

          {/* Examples */}
          <div className="mt-6 rounded border border-blue-200 bg-blue-50 p-4">
            <div className="text-xs text-blue-900 font-semibold mb-2 uppercase tracking-wide">
              Examples
            </div>
            <ul className="list-disc list-inside pl-4 space-y-1">
              {Array.isArray(word.examples) && word.examples.length > 0 ? (
                word.examples.map((ex, i) => (
                  <li key={i} className="text-blue-900">
                    <span className="capitalize font-semibold text-blue-700">
                      {(ex && ex.style) || "default"}:
                    </span>{" "}
                    {(ex && ex.text) || "—"}
                    {Array.isArray(ex?.tags) && ex.tags.length > 0 && (
                      <span className="text-xs text-gray-600 ml-2">
                        ({ex.tags.join(", ")})
                      </span>
                    )}
                  </li>
                ))
              ) : (
                <li className="text-gray-500">No examples available.</li>
              )}
            </ul>
          </div>

          {/* Synonyms / Antonyms / Groups / Tags */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <PillList title="Synonyms" items={word.synonyms} />
            <PillList title="Antonyms" items={word.antonyms} />
            <PillList title="Word Groups" items={word.word_grouping} />
            <PillList title="Tags" items={word.tags} />
          </div>

          {/* Source + External links */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded border bg-gray-50 p-4">
              <div className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wide">
                Source
              </div>
              <div className="text-blue-900 text-base font-medium">
                {word.source || <span className="text-gray-400">N/A</span>}
              </div>
            </div>
            {word.external_links && Object.keys(word.external_links).length > 0 && (
              <div className="rounded border bg-white p-4">
                <div className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wide">
                  External Links
                </div>
                <ul className="list-disc list-inside pl-4 text-blue-600 space-y-1">
                  {Object.entries(word.external_links).map(([name, url]) => (
                    <li key={name}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {name.charAt(0).toUpperCase() + name.slice(1)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={goPrev}
                disabled={safeIndex === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                ⬅ Prev
              </button>
              <button
                onClick={goNext}
                disabled={safeIndex === visibleWords.length - 1}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                Next ➡
              </button>
            </div>
            <input
              type="number"
              min="1"
              max={visibleWords.length}
              placeholder="Go to #"
              onChange={(e) => {
                const n = parseInt(e.target.value || "1", 10);
                if (!Number.isNaN(n)) {
                  setIndex(clamp(n - 1, 0, Math.max(0, visibleWords.length - 1)));
                }
              }}
              className="border border-blue-300 px-3 py-2 rounded w-28 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:ml-auto"
            />
          </div>

          {/* Toast */}
          {toast && (
            <div
              className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow text-white ${
                toast.type === "success" ? "bg-green-600" : "bg-red-600"
              }`}
            >
              {toast.msg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- small presentational bits ----------
function Row({ label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-700 font-semibold w-16">{label}:</span>
      <span className="font-semibold text-blue-700 text-base">
        {value || <span className="text-gray-400">N/A</span>}
      </span>
    </div>
  );
}

function PillList({ title, items }) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div className="bg-white border rounded p-4">
      <div className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wide">
        {title}
      </div>
      {list.length ? (
        <div className="flex flex-wrap gap-1">
          {list.map((t, i) => (
            <span
              key={`${t}-${i}`}
              className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700"
            >
              {t}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-gray-400 text-sm">N/A</span>
      )}
    </div>
  );
}