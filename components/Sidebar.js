import React, { useState } from "react";

const Sidebar = ({ setActiveTab, activeTab }) => {
  const [isCollapsed, setIsCollapsed] = useState(true); // ← default collapsed

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  const tabs = [
    { name: "Dashboard", key: "dashboard" },
    { name: "Read", key: "read" },
    { name: "Low Mastery", key: "low" },
    { name: "Quiz", key: "quiz" },
    { name: "Quiz2 (Math)", key: "quiz2" },
    { name: "Add Word", key: "add" },
    { name: "Test Fetch", key: "test" },
  ];

  return (
    <div
      className={`transition-all duration-300 ease-in-out bg-blue-900 text-white h-full ${
        isCollapsed ? "w-10" : "w-60"
      }`}
    >
      <div className="flex justify-end p-2">
        <button
          onClick={handleToggle}
          className="bg-blue-700 hover:bg-blue-600 p-1 rounded text-xs"
        >
          {isCollapsed ? "➤" : "◀"}
        </button>
      </div>

      <ul className="space-y-2 px-2">
        {tabs.map((tab) => (
          <li
            key={tab.key}
            className={`p-2 rounded cursor-pointer hover:bg-blue-700 ${
              activeTab === tab.key ? "bg-blue-700" : ""
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {isCollapsed ? tab.name.charAt(0) : tab.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
