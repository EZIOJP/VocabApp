// File: src/components/QuizModeSR.jsx
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

const QUALITY = {
  AGAIN: 1,   // wrong
  HARD: 3,    // correct but shaky
  GOOD: 4,    // correct
  EASY: 5,    // very confident
};

export default function QuizModeSR() {
  const [due, setDue] = useState([]);           // array of UserWordProgress
  const [allWords, setAllWords] = useState([]); // for distractors
  const [i, setI] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  // load due queue + whole word list (for distractors)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [dueRes, allRes] = await Promise.all([
          fetch(`${API_BASE_URL}/reviews/due/?limit=20`),
          fetch(`${API_BASE_URL}/words/`),
        ]);
        const dueJson = await dueRes.json();
        const allJson = await allRes.json();

        if (cancelled) return;

        // dueJson.results = array of user progress
        setDue(dueJson.results || []);
        setAllWords(allJson || []);
        setI(0);
        setSelected(null);
        setRevealed(false);
        setScore({ correct: 0, total: 0 });
      } catch (e) {
        if (!cancelled) setError("Failed to load review queue.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const current = due[i] || null;
  const wordObj = useMemo(() => {
    if (!current) return null;
    // find the word object for this progress item
    return allWords.find((w) => w.id === current.word) || null;
  }, [current, allWords]);

  // build multiple-choice options: 1 correct meaning + 3 random other meanings
  const options = useMemo(() => {
    if (!wordObj || !wordObj.meaning) return [];
    const pool = allWords
      .filter((w) => w.id !== wordObj.id && typeof w.meaning === "string" && w.meaning.length > 0)
      .sort(() => Math.random() - 0.5)
      .slice(0, 12) // a bit more to avoid duplicates
      .map((w) => w.meaning);

    const wrong = Array.from(new Set(pool)).slice(0, 3);
    const all = [...wrong, wordObj.meaning].sort(() => Math.random() - 0.5);
    return all;
  }, [allWords, wordObj]);

  const handleChoose = (opt) => {
    setSelected(opt);
    setRevealed(true);
  };

  const isCorrect = selected != null && wordObj && selected === wordObj.meaning;

  const sendAnswer = async (quality) => {
    if (!wordObj) return;
    try {
      setPosting(true);
      const r =await fetch(`${API_BASE_URL}/reviews/answer/`, {
  method: "POST",
  headers: {"Content-Type":"application/json"},
  body: JSON.stringify({ word_id: currentWord.id, quality: correct ? 4 : 2 })
});
      if (!r.ok) throw new Error("answer failed");
      // we don’t need response to move on; queue is server-side
      setScore((s) => ({
        correct: s.correct + (quality >= 3 ? 1 : 0),
        total: s.total + 1,
      }));
      // go next
      setSelected(null);
      setRevealed(false);
      setI((prev) => prev + 1);
    } catch (e) {
      setError("Could not submit answer.");
    } finally {
      setPosting(false);
    }
  };

  if (loading) return <div className="p-4">Loading due reviews…</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!due.length) return <div className="p-4">No reviews due 🎉</div>;
  if (!current || !wordObj) return <div className="p-4">Loading item…</div>;
  if (!wordObj.meaning) return <div className="p-4">This word has no meaning field.</div>;

  const endReached = i >= due.length;

  if (endReached) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold">All due reviews done!</h2>
        <p className="mt-2">
          Score: <b>{score.correct}</b> / {score.total}
        </p>
        <p className="mt-2 text-sm text-gray-500">Come back when more items are due.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Spaced Repetition Quiz</h2>
        <span className="text-sm text-gray-500">
          {i + 1} / {due.length} • Score {score.correct}/{score.total}
        </span>
      </div>

      <div className="mb-4">
        <div className="text-2xl font-bold text-blue-700">{wordObj.word}</div>
        {wordObj.pronunciation && (
          <div className="text-gray-500">{wordObj.pronunciation}</div>
        )}
      </div>

      <div className="grid gap-2 mb-4">
        {options.map((opt, idx) => {
          const isRight = revealed && opt === wordObj.meaning;
          const isChosenWrong = revealed && selected === opt && opt !== wordObj.meaning;
          return (
            <button
              key={idx}
              onClick={() => handleChoose(opt)}
              disabled={revealed}
              className={`text-left p-2 rounded border ${
                revealed
                  ? isRight
                    ? "bg-green-100 border-green-400"
                    : isChosenWrong
                    ? "bg-red-100 border-red-400"
                    : "bg-white border-gray-200"
                  : "hover:bg-gray-50 border-gray-200"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {revealed && (
        <>
          {!isCorrect && (
            <div className="mb-3 text-sm text-slate-700">
              Correct: <b>{wordObj.meaning}</b>
              {Array.isArray(wordObj.examples) && wordObj.examples[0]?.text ? (
                <div className="text-gray-600 mt-1">
                  <i>{wordObj.examples[0].text}</i>
                </div>
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => sendAnswer(QUALITY.AGAIN)}
              disabled={posting}
              className="px-3 py-1.5 rounded bg-red-600 text-white disabled:opacity-50"
              title="Wrong / forgot"
            >
              Again
            </button>
            <button
              onClick={() => sendAnswer(QUALITY.HARD)}
              disabled={posting}
              className="px-3 py-1.5 rounded bg-amber-600 text-white disabled:opacity-50"
              title="Correct but unsure"
            >
              Hard
            </button>
            <button
              onClick={() => sendAnswer(QUALITY.GOOD)}
              disabled={posting}
              className="px-3 py-1.5 rounded bg-green-600 text-white disabled:opacity-50"
              title="Correct"
            >
              Good
            </button>
            <button
              onClick={() => sendAnswer(QUALITY.EASY)}
              disabled={posting}
              className="px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50"
              title="Very confident"
            >
              Easy
            </button>
          </div>
        </>
      )}
    </div>
  );
}
