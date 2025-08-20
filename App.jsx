// File: src/App.jsx
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import ReadMode from "./components/ReadMode";
import LowMastery from "./components/LowMastery";
import QuizMode from "./components/QuizMode";
import TestWordFetch from "./components/TestWordFetch";
import AddWordJSON from "./components/AddWordJSON";
import QuizModeMath from "./components/QuizModeMath";
import TopBar from "./components/TopBar";

// ✅ Moved mockWords outside component to avoid ReferenceError

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);


  return (
    
    <div className="flex h-screen">
      <button
  className="sm:hidden p-2 bg-blue-500 text-white fixed top-2 left-2 z-50 rounded"
  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
>
  ☰
</button>

      <Sidebar setActiveTab={setActiveTab} activeTab={activeTab} />

      <div className="flex-1 flex flex-col h-full bg-blue-50 overflow-auto">
        <TopBar />
        <div className="flex-1 p-4 sm:p-6">
          {activeTab === "dashboard" && <Dashboard />}
          {activeTab === "read" && <ReadMode  />}
          {activeTab === "low" && <LowMastery  />}
          {activeTab === "quiz" && <QuizMode />}
          {activeTab === "test" && <TestWordFetch  />}
          {activeTab === "add" && <AddWordJSON   />}
          {activeTab === "quiz2" && <QuizModeMath/>}
        </div>
      </div>
    </div>
  );
}
