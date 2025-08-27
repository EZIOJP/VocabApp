import React, { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

/**
 * Smart Quiz:
 *  - Casual mode: pulls from /api/words/ (sample size selectable), updates legacy quiz stats.
 *  - SR mode: pulls from /api/reviews/due/, posts answers to /api/reviews/answer/ (SM-2).
 */

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const take = (arr, n) => arr.slice(0, Math.max(0, n));

export default function QuizModeSmart() {
  const [mode, setMode] = useState("casual"); // "casual" | "sr"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // pools
  const [allWords, setAllWords] = useState([]);          // for distractors and casual questions
  const [casualWords, setCasualWords] = useState([]);    // selected subset for casual quiz
  const [dueItems, setDueItems] = useState([]);          // SR items (UserWordProgress with .word)

  // quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [casualCount, setCasualCount] = useState(10); // how many in casual quiz

  // Fetch all words once (for distractors + casual pool)
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setError("");
        const r = await fetch(`${API_BASE_URL}/words/`);
        const data = await r.json();
        if (abort) return;
        setAllWords(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!abort) setError("Failed to fetch words.");
      }
    })();
    return () => { abort = true; };
  }, []);

  // Load per-mode questions
  const loadCasual = useCallback(() => {
    if (allWords.length < 4) {
      setError("Need at least 4 words for a multiple-choice quiz.");
      return;
    }
    setError("");
    const set = take(shuffle(allWords), casualCount);
    setCasualWords(set);
    setCurrentIndex(0);
    setScore(0);
    setSelected(null);
    setShowResult(false);
    setDone(false);
  }, [allWords, casualCount]);

  const loadDue = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const r = await fetch(`${API_BASE_URL}/reviews/due/?limit=50`);
      const data = await r.json();
      const results = (data && Array.isArray(data.results)) ? data.results : [];
      // results are UserWordProgress objects; each has .word_id but we need the actual word.
      // If your endpoint doesn’t embed the Word, we’ll fetch words and map by id:
      const mapById = new Map(allWords.map(w => [w.id, w]));
      const withWord = results
        .map(u => ({ ...u, word: mapById.get(u.word) }))
        .filter(u => !!u.word);

      if (withWord.length === 0) {
        setDueItems([]);
        setDone(true);
        setError("No reviews due. 🎉");
      } else {
        setDueItems(withWord);
        setCurrentIndex(0);
        setScore(0);
        setSelected(null);
        setShowResult(false);
        setDone(false);
      }
    } catch {
      setError("Failed to fetch due reviews.");
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, allWords]);

  // When mode changes, (re)load
  useEffect(() => {
    if (mode === "casual") {
      loadCasual();
    } else {
      loadDue();
    }
  }, [mode, loadCasual, loadDue]);

  // Current question word (depends on mode)
  const currentWord = useMemo(() => {
    if (mode === "casual") return casualWords[currentIndex];
    const item = dueItems[currentIndex];
    return item ? item.word : undefined;
  }, [mode, casualWords, dueItems, currentIndex]);

  const totalQuestions = mode === "casual" ? casualWords.length : dueItems.length;

  // Generate options (meanings from other words + correct meaning)
  const generateOptions = useCallback(() => {
    if (!currentWord || !currentWord.meaning) return [];
    // distractors pool = all words except the current
    const pool = allWords.filter(w => w.id !== currentWord.id && !!w.meaning);
    const distractors = take(shuffle(pool).map(w => w.meaning), 3);
    return shuffle([...distractors, currentWord.meaning]);
  }, [allWords, currentWord]);

  // Refresh options whenever the question changes
  useEffect(() => {
    if (!currentWord) return;
    setOptions(generateOptions());
    setSelected(null);
    setShowResult(false);
  }, [currentWord, generateOptions]);

  // ——— Submit/grade handlers ———
  async function submitCasualUpdate(wordId, correct) {
    // legacy global update (non-user specific)
    try {
      await fetch(`${API_BASE_URL}/words/${wordId}/update_quiz_stats/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correct }),
      });
    } catch {
      // don't block UI if this fails
    }
  }

  async function submitSRAnswer(wordId, correct) {
    // SM-2 expects quality 0..5; map MC correct → 4 (good), incorrect → 2 (fail)
    const quality = correct ? 4 : 2;
    await fetch(`${API_BASE_URL}/reviews/answer/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word_id: wordId, quality }),
    });
  }

  const handleOptionClick = async (option) => {
    if (!currentWord) return;
    setSelected(option);
    const correct = option === currentWord.meaning;
    setShowResult(true);
    if (correct) setScore((s) => s + 1);

    // Fire-and-forget backend update
    if (mode === "casual") {
      submitCasualUpdate(currentWord.id, correct);
    } else {
      try { await submitSRAnswer(currentWord.id, correct); } catch { /* ignore */ }
    }
  };

  const nextQuestion = () => {
    const next = currentIndex + 1;
    if (next >= totalQuestions) {
      setDone(true);
      return;
    }
    setCurrentIndex(next);
  };

  // ——— UI ———
  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
        <h1 className="text-2xl font-bold">Quiz Mode</h1>

        <div className="flex items-center gap-2 ml-0 sm:ml-auto">
          <label className="text-sm">
            <input
              type="radio"
              name="mode"
              value="casual"
              checked={mode === "casual"}
              onChange={() => setMode("casual")}
              className="mr-1"
            />
            Casual
          </label>
          <label className="text-sm">
            <input
              type="radio"
              name="mode"
              value="sr"
              checked={mode === "sr"}
              onChange={() => setMode("sr")}
              className="mr-1"
            />
            Spaced Repetition
          </label>
        </div>
      </div>

      {mode === "casual" && (
        <div className="mb-4 flex items-center gap-2">
          <label className="text-sm text-slate-700"># of questions:</label>
          <select
            value={casualCount}
            onChange={(e) => setCasualCount(parseInt(e.target.value, 10))}
            className="border rounded px-2 py-1 text-sm"
          >
            {[5, 10, 20, 30].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <button
            onClick={loadCasual}
            className="ml-2 px-3 py-1.5 rounded bg-blue-600 text-white text-sm"
          >
            New Casual Quiz
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded bg-red-100 text-red-800 text-sm">
          {error}
        </div>
      )}

      {loading && <div className="p-3">Loading…</div>}

      {!loading && totalQuestions === 0 && (
        <div className="p-4 rounded border bg-white">
          {mode === "sr"
            ? "No SR reviews due right now. 🎉"
            : "Not enough words to start a quiz."}
        </div>
      )}

      {!loading && totalQuestions > 0 && currentWord && (
        <div className="rounded-lg border bg-white p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-slate-600">
              Q {currentIndex + 1} / {totalQuestions}
            </div>
            <div className="text-sm font-semibold">
              Score: {score}
            </div>
          </div>

          {/* Word prompt */}
          <div className="mb-4">
            <div className="text-lg sm:text-xl font-semibold">
              What is the meaning of <span className="italic">“{currentWord.word}”</span>?
            </div>
            {currentWord.pronunciation && (
              <div className="text-slate-500 text-sm mt-1">({currentWord.pronunciation})</div>
            )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-2 mb-4">
            {options.map((opt, i) => {
              const isCorrect = opt === currentWord.meaning;
              const isSelected = selected === opt;
              const bg =
                showResult
                  ? isCorrect
                    ? "bg-green-200 border-green-500"
                    : isSelected
                    ? "bg-red-200 border-red-500"
                    : "bg-gray-50"
                  : "bg-gray-50 hover:bg-gray-100";
              return (
                <button
                  key={`${i}-${opt.slice(0, 20)}`}
                  disabled={showResult}
                  onClick={() => handleOptionClick(opt)}
                  className={`p-2 rounded border text-left ${bg}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Explanation + Next */}
          {showResult && (
            <div className="mb-4">
              <p className="font-semibold text-blue-700">
                Correct meaning: {currentWord.meaning}
              </p>
              <p className="text-slate-700 mt-2">
                {Array.isArray(currentWord.examples) && currentWord.examples[0]?.text
                  ? currentWord.examples[0].text
                  : "No example available."}
              </p>
            </div>
          )}

          {!done ? (
            <div className="flex justify-end">
              <button
                onClick={showResult ? nextQuestion : undefined}
                disabled={!showResult}
                className="px-4 py-2 rounded bg-purple-600 text-white disabled:opacity-50"
              >
                {currentIndex + 1 === totalQuestions ? "Finish" : "Next"}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {done && (
        <div className="mt-4 p-4 rounded bg-slate-50 border">
          <div className="text-lg font-bold mb-1">Quiz Completed 🎉</div>
          <div className="text-slate-700 mb-4">
            Final Score: {score} / {totalQuestions}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setCurrentIndex(0);
                setScore(0);
                setSelected(null);
                setShowResult(false);
                setDone(false);
                if (mode === "casual") loadCasual();
                else loadDue();
              }}
              className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm"
            >
              Restart {mode === "casual" ? "Casual" : "SR"} Quiz
            </button>
            {mode === "casual" && (
              <button
                onClick={() => setMode("sr")}
                className="px-3 py-1.5 rounded border text-sm"
              >
                Switch to SR
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
