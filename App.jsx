// App.jsx - FINAL VERSION - Updated to use the correct CycleMode
import { useState } from "react";
import { ThemeProvider } from "./components/ThemeContext";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import ThemeToggle from "./components/ThemeToggle";
import ThemeLearning from "./components/ThemeLearning";
// Import all sub-pages/components
import Dashboard from "./components/Dashboard";
import ReadMode from "./components/ReadMode";
import LowMastery from "./components/LowMastery";
import TestWordFetch from "./components/TestWordFetch";
import AddWordJSON from "./components/AddWordJSON";
import QuizModeMath from "./components/QuizModeMath";
import CycleManger from "./components/CycleManager"; // ✅ FINAL WORKING VERSION
import "./components/UniversalReadMode.css";


import ReactDOM from "react-dom";
// Import the new universal components
import UniversalReadMode from "./components/UniversalReadMode";
import { ReadModeConfigs } from "./components/readModeAPI";

// Enhanced ReadMode components using UniversalReadMode
const EnhancedReadMode = () => (
  <UniversalReadMode {...ReadModeConfigs.allWords} />
);

const EnhancedLowMastery = () => (
  <UniversalReadMode {...ReadModeConfigs.lowMastery} />
);

const DueReviewMode = () => (
  <UniversalReadMode {...ReadModeConfigs.dueReview} />
);

const StrugglingWordsMode = () => (
  <UniversalReadMode {...ReadModeConfigs.struggling} />
);

// Central tab registry for easy maintenance
const TAB_COMPONENTS = {
  dashboard: Dashboard,
  read: ReadMode,
  low: EnhancedLowMastery,
  due: DueReviewMode,
  struggling: StrugglingWordsMode,
  test: TestWordFetch,
  add: AddWordJSON,
  quiz2: QuizModeMath,
  cycle: CycleManger, // ✅ FINAL: Uses complete cycle system with dashboard first!
  themetest: ThemeLearning,

  // Keep legacy versions for comparison
  "read-legacy": ReadMode,
  "low-legacy": LowMastery,
  "read-enhanced": EnhancedReadMode,
};

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Dynamically pick the component by tab key
  const ActivePage = TAB_COMPONENTS[activeTab] || Dashboard;

  return (
    <ThemeProvider>
      <div className="flex h-screen transition-colors duration-300">
        {/* Sidebar toggle for mobile */}
        <button
          className="sm:hidden p-2 bg-blue-500 text-white fixed top-2 left-2 z-50 rounded"
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          aria-expanded={isSidebarOpen}
          onClick={() => setIsSidebarOpen((v) => !v)}
        >
          ☰
        </button>

        {/* Sidebar always visible on desktop, toggleable on mobile */}
        <Sidebar
          setActiveTab={setActiveTab}
          activeTab={activeTab}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      
        <div className="flex-1 flex flex-col h-full bg-blue-50 dark:bg-gray-900 overflow-auto transition-colors duration-300">
          <TopBar>
            {/* Add theme toggle to TopBar */}
            <div className="flex items-center space-x-4">
              <ThemeToggle size="sm" />
            </div>
          </TopBar>
          
          <main className="flex-1 p-4 sm:p-6 transition-colors duration-300">
            <ActivePage />
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}