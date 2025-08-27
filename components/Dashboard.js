import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

export default function Dashboard() {
  const [words, setWords] = useState([]);
  const [wordOfDay, setWordOfDay] = useState(null);
  const [wordsReadThisWeek, setWordsReadThisWeek] = useState(0);
  const [dueCount, setDueCount] = useState(0);
  const wordsReadGoal = 30;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/words/`);
        const data = await r.json();
        if (cancelled) return;

        setWords(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) {
          const random = data[Math.floor(Math.random() * data.length)];
          setWordOfDay(random);
          // demo stat
          setWordsReadThisWeek(Math.min(data.length, 12 + Math.floor(Math.random() * 10)));
        } else {
          setWordOfDay(null);
          setWordsReadThisWeek(0);
        }
      } catch {
        if (!cancelled) {
          setWords([]);
          setWordOfDay(null);
          setWordsReadThisWeek(0);
        }
      }
    })();

    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/reviews/due/?limit=999`);
        const data = await r.json();
        if (!cancelled) {
          setDueCount(Array.isArray(data?.results) ? data.results.length : 0);
        }
      } catch {
        if (!cancelled) setDueCount(0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-0 max-w-5xl mx-auto w-full">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 px-6">
        <StatCard title="Total Words" value={words.length} tone="blue" />
        <StatCard
          title="Words Read This Week"
          value={
            <span>
              {wordsReadThisWeek} <span className="text-gray-500">/ {wordsReadGoal}</span>
            </span>
          }
          tone="green"
        />
        <StatCard title="Word of the Day" value={wordOfDay ? wordOfDay.word : "..."} tone="yellow" />
        <StatCard title="Due Reviews" value={dueCount} tone="purple" />
      </div>

      {/* Word of the day card */}
      {wordOfDay && (
        <div className="bg-white rounded-lg shadow p-6 mb-8 mx-6">
          <div className="flex flex-col gap-3">
            <div className="text-2xl font-bold">
              {wordOfDay.word}{" "}
              <span className="text-lg text-gray-500">{wordOfDay.pronunciation}</span>
            </div>
            <div className="text-gray-800 italic">{wordOfDay.meaning}</div>
            <div className="text-sm">
              <span className="font-semibold">Connotation:</span>{" "}
              <span className="capitalize">{wordOfDay.connotation || "neutral"}</span>
            </div>
            {wordOfDay.etymology && (
              <div className="text-sm">
                <span className="font-semibold">Etymology:</span> {wordOfDay.etymology}
              </div>
            )}
            {wordOfDay.story_mnemonic && (
              <div className="text-sm">
                <span className="font-semibold">Story Mnemonic:</span> {wordOfDay.story_mnemonic}
              </div>
            )}
            {wordOfDay.word_breakdown && typeof wordOfDay.word_breakdown === "object" && (
              <div className="text-sm">
                <span className="font-semibold">Word Breakdown: </span>
                {Object.entries(wordOfDay.word_breakdown).map(([k, v]) => (
                  <span key={k} className="inline-block mr-2">
                    <span className="font-mono text-xs bg-gray-100 px-1 rounded">{k}: {v}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-gray-400 text-xs text-center mb-4">
        Data is fetched from backend. For real stats, connect user progress + SR.
      </div>
    </div>
  );
}

function StatCard({ title, value, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    yellow: "bg-yellow-50 text-yellow-700",
    purple: "bg-purple-50 text-purple-700",
  };
  return (
    <div className={`${tones[tone] || tones.blue} rounded-lg p-4 shadow flex flex-col items-center`}>
      <span className="text-3xl font-bold">{value}</span>
      <span className="text-gray-700 mt-1">{title}</span>
    </div>
  );
}