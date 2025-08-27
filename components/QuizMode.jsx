import React, { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

export default function QuizMode() {
  const [words, setWords] = useState([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizLength, setQuizLength] = useState(null); // null = unlimited
  const [index, setIndex] = useState(0);
  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  // Fetch words
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/words/`);
        const data = await r.json();
        if (cancelled) return;
        const arr = Array.isArray(data) ? data : [];
        // shuffle once
        setWords([...arr].sort(() => Math.random() - 0.5));
      } catch (e) {
        if (!cancelled) setWords([]);
        console.error("fetch words error:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // current word (respect quizLength if set)
  const quizPool = useMemo(() => {
    if (!Array.isArray(words)) return [];
    if (quizLength && quizLength > 0) return words.slice(0, quizLength);
    return words;
  }, [words, quizLength]);

  const currentWord = quizPool[index] || null;

  // Helpers
  function sampleN(arr, n) {
    const pool = [...arr];
    const out = [];
    while (pool.length && out.length < n) {
      const i = Math.floor(Math.random() * pool.length);
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }

  const generateOptions = useCallback(() => {
    if (!currentWord || !Array.isArray(quizPool) || quizPool.length < 2) return [];

    const correct = typeof currentWord.meaning === "string" ? currentWord.meaning : "";
    const otherMeanings = quizPool
      .filter(w => w && w.id !== currentWord.id && typeof w.meaning === "string" && w.meaning.trim() !== "")
      .map(w => w.meaning);

    const distractors = sampleN([...new Set(otherMeanings)], 3);
    const merged = [...distractors, correct]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);

    while (merged.length < 4 && otherMeanings.length) {
      const extra = sampleN(otherMeanings, 1)[0];
      if (extra && !merged.includes(extra)) merged.push(extra);
    }
    return merged.sort(() => Math.random() - 0.5);
  }, [currentWord, quizPool]);

  useEffect(() => {
    setOptions(generateOptions());
    setSelected(null);
    setShowResult(false);
  }, [generateOptions]);

  // Submit answer + update legacy quiz stats
  async function submitAnswer(opt) {
    if (!currentWord) return;
    setSelected(opt);
    const correct = opt === currentWord.meaning;
    setShowResult(true);
    if (correct) setScore(s => s + 1);

    // legacy global stats endpoint (optional; safe if present)
    try {
      await fetch(`${API_BASE_URL}/words/${currentWord.id}/update_quiz_stats/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correct }),
      });
    } catch {
      // ignore if not configured
    }
  }

  function next() {
    const nextIndex = index + 1;
    if (nextIndex >= quizPool.length) {
      setDone(true);
    } else {
      setIndex(nextIndex);
    }
  }

  function start(length) {
    setQuizLength(length); // 10 or null (unlimited)
    setQuizStarted(true);
    setIndex(0);
    setScore(0);
    setDone(false);
    setSelected(null);
    setShowResult(false);
  }

  if (!quizStarted) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Quiz Mode</h1>
        {words.length < 4 ? (
          <div className="text-red-600">Need at least 4 words to start a quiz.</div>
        ) : (
          <>
            <p className="mb-4 text-gray-700">Choose quiz length:</p>
            <div className="flex gap-3">
              <button
                onClick={() => start(10)}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                10 Questions
              </button>
              <button
                onClick={() => start(null)}
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
              >
                Unlimited
              </button>
            </div>
            <p className="mt-6 text-sm text-gray-500">
              Total words available: {words.length}. Options are drawn from other words’ meanings.
            </p>
          </>
        )}
      </div>
    );
  }

  if (done) {
    const total = quizPool.length || 0;
    const pct = total ? Math.round((score / total) * 100) : 0;
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <h2 className="text-2xl font-bold">Quiz Completed 🎉</h2>
        <p className="mt-3 text-lg">
          Score: <span className="font-bold">{score}</span> / {total} ({pct}%)
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={() => start(10)}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Play 10 Questions
          </button>
          <button
            onClick={() => start(null)}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
          >
            Play Unlimited
          </button>
        </div>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Quiz Mode</h1>
        <p>Loading question...</p>
      </div>
    );
  }

  const total = quizPool.length || 0;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Quiz Mode</h1>
        <div className="text-sm text-gray-600">
          Q {index + 1} / {total} &nbsp;|&nbsp; Score {score}
        </div>
      </div>

      <div className="mb-4 p-4 bg-white shadow rounded">
        <p className="text-lg font-semibold">
          What is the meaning of “<span className="italic">{currentWord.word}</span>”?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 mb-4">
        {options.map((opt, i) => {
          const isCorrect = opt === currentWord.meaning;
          const isChosen = selected === opt;

          let cls = "p-2 rounded border hover:bg-gray-100";
          if (showResult) {
            if (isCorrect) cls = "p-2 rounded border bg-green-200 border-green-500";
            else if (isChosen) cls = "p-2 rounded border bg-red-200 border-red-500";
          }

          return (
            <button
              key={i}
              onClick={() => submitAnswer(opt)}
              className={cls}
              disabled={showResult}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {showResult && (
        <div className="mb-4">
          <p className="font-semibold text-blue-700">
            Correct meaning: {currentWord.meaning}
          </p>
          <p className="text-gray-700 mt-2">
            {Array.isArray(currentWord.examples) && currentWord.examples[0]?.text
              ? currentWord.examples[0].text
              : "No example available."}
          </p>
        </div>
      )}

      <button
        onClick={showResult ? next : undefined}
        disabled={!showResult}
        className="mt-2 px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}