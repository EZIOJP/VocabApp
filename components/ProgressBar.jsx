// src/components/ProgressBar.jsx
import React from 'react';

export default function ProgressBar({ current, total }) {
  const pct = Math.min(100, Math.round((current / total) * 100));
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden my-2">
      <div
        className="bg-blue-500 h-2"
        style={{ width: `${pct}%`, transition: 'width 0.3s ease' }}
      />
    </div>
  );
}
