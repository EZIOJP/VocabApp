// File: src/components/Sidebar.jsx
import React, { useEffect, useState } from "react";

const LS_KEY = "sidebar:collapsed";

const TABS = [
  { name: "Dashboard", key: "dashboard", icon: "🏠" },
  { name: "Read", key: "read", icon: "📖" },
  { name: "Low Mastery", key: "low", icon: "⬇" },
  //{ name: "Quiz", key: "quiz", icon: "📝" },
  { name: "Quiz2 (Math)", key: "quiz2", icon: "➗" },
  //{ name: "Quizsr", key: "quizSR", icon: "🔁" },
  { name: "Add Word", key: "add", icon: "➕" },
  { name: "Test Fetch", key: "test", icon: "🔬" },
  { name: "CycleManger", key: "cycle", icon: "X" },
  { name: "Due Reviews", key: "due", icon: "⏰" },
  { name: "Struggling", key: "struggling", icon: "⚠️" },
  { name: "Theme Test", key: "themetest", icon: "🎨" },
  { name: "WordCard", key: "WordCard", icon: "V" },

];

export default function Sidebar({ setActiveTab, activeTab }) {
  // default collapsed, but restore from localStorage if present
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved === "0" || saved === "1") {
        setIsCollapsed(saved === "1");
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, isCollapsed ? "1" : "0");
    } catch {}
  }, [isCollapsed]);

  const handleToggle = () => setIsCollapsed((v) => !v);

  return (
    <nav
      aria-label="Main"
      className={`transition-all duration-300 ease-in-out bg-blue-900 text-white h-full 
        ${isCollapsed ? "w-12" : "w-60"} 
        flex flex-col`}
    >
      {/* Top: collapse toggle */}
      <div className="flex items-center justify-end p-2">
        <button
          onClick={handleToggle}
          className="bg-blue-700 hover:bg-blue-600 px-2 py-1 rounded text-xs focus:outline-none focus:ring-2 focus:ring-white/50"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand" : "Collapse"}
        >
          {isCollapsed ? "➤" : "◀"}
        </button>
      </div>

      {/* Menu */}
      <ul role="tablist" className="space-y-1 px-1 pb-3 overflow-y-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <li key={tab.key}>
              <button
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-2 rounded px-2 py-2 text-left
                  hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-white/50
                  ${isActive ? "bg-blue-700" : ""}
                `}
                // when collapsed, show tooltip with full name
                title={isCollapsed ? tab.name : undefined}
              >
                <span className="shrink-0 text-base leading-none">{tab.icon}</span>
                {!isCollapsed ? (
                  <span className="truncate">{tab.name}</span>
                ) : (
                  // collapsed: show just first letter as a fallback to icon
                  <span className="sr-only">{tab.name}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Footer (optional) */}
      <div className="mt-auto p-2 text-[10px] text-white/70 select-none">
        {!isCollapsed ? "vocab-app" : "VA"}
      </div>
    </nav>
  );
}