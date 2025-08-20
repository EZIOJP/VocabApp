// ...existing code...

// Pomodoro Timer Component (simple demo)
// ...existing code...

// TopBar with Pomodoro
// ...existing code...

// ...existing code...


import React, { useState, useEffect } from "react";
import axios from "axios";

const Dashboard = () => {
  const [words, setWords] = useState([]);
  const [wordOfDay, setWordOfDay] = useState(null);
  // Pomodoro and TopBar are now global
  const [wordsReadThisWeek, setWordsReadThisWeek] = useState(0);
  const wordsReadGoal = 30;

  useEffect(() => {
    axios
      .get("http://192.168.0.106:8000/api/words/")
      .then((res) => {
        setWords(res.data);
        if (res.data.length > 0) {
          setWordOfDay(res.data[Math.floor(Math.random() * res.data.length)]);
        }
        // For demo: mock words read this week as a random number <= total
        setWordsReadThisWeek(
          Math.min(res.data.length, 12 + Math.floor(Math.random() * 10))
        );
      })
      .catch(() => {
        setWords([]);
        setWordOfDay(null);
        setWordsReadThisWeek(0);
      });
  }, []);

  return (
    <div className="p-0 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 px-6">
        <div className="bg-blue-50 rounded-lg p-4 shadow flex flex-col items-center">
          <span className="text-4xl font-bold text-blue-600">
            {words.length}
          </span>
          <span className="text-gray-700 mt-1">Total Words</span>
        </div>
        <div className="bg-green-50 rounded-lg p-4 shadow flex flex-col items-center">
          <span className="text-2xl font-bold text-green-700">
            {wordsReadThisWeek}{" "}
            <span className="text-base text-gray-500">/ {wordsReadGoal}</span>
          </span>
          <span className="text-gray-700 mt-1">Words Read This Week</span>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 shadow flex flex-col items-center">
          <span className="text-xl font-semibold text-yellow-700">
            {wordOfDay ? wordOfDay.word : "..."}
          </span>
          <span className="text-gray-700 mt-1">Word of the Day</span>
        </div>
      </div>

      {wordOfDay && (
        <div className="bg-white rounded-lg shadow p-6 mb-8 mx-6">
          <div className="flex flex-col md:flex-row md:items-center md:gap-6">
            <div className="flex-1">
              <div className="text-2xl font-bold mb-1">
                {wordOfDay.word}{" "}
                <span className="text-lg text-gray-500">
                  {wordOfDay.pronunciation}
                </span>
              </div>
              <div className="text-gray-700 mb-2 italic">
                {wordOfDay.meaning}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Connotation:</span>{" "}
                <span className="capitalize">{wordOfDay.connotation}</span>
              </div>
              <div className="mb-2">
                <span className="font-semibold">Etymology:</span>{" "}
                {wordOfDay.etymology}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Story Mnemonic:</span>{" "}
                {wordOfDay.story_mnemonic}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Word Breakdown:</span>{" "}
                {wordOfDay.word_breakdown &&
                typeof wordOfDay.word_breakdown === "object"
                  ? Object.entries(wordOfDay.word_breakdown).map(([k, v]) => (
                      <span key={k} className="inline-block mr-2">
                        <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                          {k}: {v}
                        </span>
                      </span>
                    ))
                  : null}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-gray-400 text-xs text-center mb-4">
        Data is fetched from backend. For real stats, connect user progress.
      </div>
    </div>
  );
};

export default Dashboard;
