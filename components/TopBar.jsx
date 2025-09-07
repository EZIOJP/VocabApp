import React, { useState } from "react";
import ThemeToggle from "../components/ThemeToggle";
// List of fun easter eggs (emoji, quote, or fun fact)
const EASTER_EGGS = [
  "🌱 Stay curious!",
  "🦉 Did you know? Owls can rotate their heads 270°!",
  "🎲 Randomness is fun!",
  "💡 Tip: Take a 5-min break every 25 mins!",
  "🚀 Launch your learning!",
  "🍀 Lucky word day!",
  "🧠 Brain gains!",
  "🐙 Octopuses have 3 hearts!",
  "📚 Read a word, change your world!",
  "🎵 Music boosts memory!",
  "🦄 Unicorns love vocab!",
  "🔥 Keep the streak alive!",
  "🌈 Find the word at the end of the rainbow!",
  "🧩 Every word is a puzzle piece!",
  "🕹️ Level up your vocab!"
];


const MODES = {
  WORK: { duration: 25 * 60, label: "Focus", color: "bg-blue-200 text-blue-800", icon: "💼" },
  SHORT_BREAK: { duration: 5 * 60, label: "Short Break", color: "bg-green-200 text-green-800", icon: "☕" },
  LONG_BREAK: { duration: 15 * 60, label: "Long Break", color: "bg-yellow-200 text-yellow-800", icon: "🌴" }
};

function formatTime(sec) {
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}


function PomodoroTimerDockable() {
  const [mode, setMode] = useState("WORK");
  const [timeLeft, setTimeLeft] = useState(MODES.WORK.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalFocus, setTotalFocus] = useState(0);
  const intervalRef = React.useRef(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [autoExpand, setAutoExpand] = useState(false);

  // Handle timer
  React.useEffect(() => {
    if (!isRunning) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line
  }, [isRunning]);

  // Reset timer when mode changes
  React.useEffect(() => {
    setTimeLeft(MODES[mode].duration);
    setIsRunning(false);
  }, [mode]);

  // Auto-expand when timer completes
  React.useEffect(() => {
    if (autoExpand) setExpanded(true);
  }, [autoExpand]);

  // Handle session complete
  const handleComplete = () => {
    setAutoExpand(true);
    if (mode === "WORK") {
      setCompletedSessions((c) => c + 1);
      setSessionCount((c) => c + 1);
      setTotalFocus((t) => t + MODES.WORK.duration);
      // Every 4th work session, take a long break
      if ((sessionCount + 1) % 4 === 0) {
        setMode("LONG_BREAK");
      } else {
        setMode("SHORT_BREAK");
      }
    } else {
      // After break, go back to work
      setMode("WORK");
      if (mode === "LONG_BREAK") setStreak((s) => s + 1);
    }
    setIsRunning(false);
    setTimeout(() => setAutoExpand(false), 2000);
  };

  const handleStartPause = () => setIsRunning((r) => !r);
  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(MODES[mode].duration);
  };
  const handleSkip = () => {
    setIsRunning(false);
    handleComplete();
  };

  // Floating icon button
  return (
    <>
      <button
        aria-label="Open Pomodoro Timer"
        className={`relative flex items-center justify-center w-10 h-10 rounded-full bg-blue-700 hover:bg-blue-800 shadow-lg transition-all duration-200 focus:outline-none border-2 border-blue-300 ${expanded ? 'ring-4 ring-blue-300' : ''}`}
        style={{ boxShadow: '0 2px 8px #0002' }}
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="text-2xl">🍅</span>
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs font-mono text-white bg-blue-900/80 px-1 rounded shadow">
          {formatTime(timeLeft)}
        </span>
      </button>
      {expanded && (
        <div className="fixed top-16 right-4 z-50 bg-white rounded-xl shadow-2xl border-2 border-blue-200 p-4 w-80 animate-fade-in flex flex-col items-center gap-2" style={{minWidth:280}}>
          <div className={`flex items-center gap-2 px-2 py-1 rounded-full shadow ${MODES[mode].color} font-semibold mb-1`}>
            <span>{MODES[mode].icon}</span>
            <span>{MODES[mode].label}</span>
          </div>
          <span className="font-mono font-bold text-3xl tracking-widest">
            {formatTime(timeLeft)}
          </span>
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleStartPause}
              className={`px-3 py-1 rounded ${isRunning ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'} font-semibold`}
            >
              {isRunning ? "Pause" : "Start"}
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1 rounded bg-gray-100 text-gray-700 font-semibold"
            >
              Reset
            </button>
            <button
              onClick={handleSkip}
              className="px-3 py-1 rounded bg-yellow-100 text-yellow-700 font-semibold"
            >
              Skip
            </button>
          </div>
          <div className="flex gap-4 mt-2 text-sm text-gray-600">
            <span>Sessions: {completedSessions}</span>
            <span>Streak: {streak}</span>
            <span>Focus: {Math.floor(totalFocus/60)}m</span>
          </div>
          <button
            className="mt-2 px-3 py-1 rounded bg-blue-200 hover:bg-blue-300 text-blue-900 font-semibold"
            onClick={() => setExpanded(false)}
          >Close</button>
        </div>
      )}
    </>
  );
}

export default function TopBar() {
  // Pick a random easter egg on mount
  const [egg] = useState(() => EASTER_EGGS[Math.floor(Math.random() * EASTER_EGGS.length)]);

  return (
    <header className="w-full sticky top-0 z-50 bg-gradient-to-r from-blue-900/90 via-blue-700/90 to-blue-500/80 shadow flex items-center justify-between px-4 sm:px-8 py-2 mb-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl font-extrabold text-white tracking-tight drop-shadow">VocabApp</span>
      

<header>              
  {/* other controls */}
  <ThemeToggle size="md" />
</header>

        <span className="hidden sm:inline text-blue-100 text-xs font-mono italic opacity-80">{egg}</span>
      </div>
  <PomodoroTimerDockable />
    </header>
  );
}
