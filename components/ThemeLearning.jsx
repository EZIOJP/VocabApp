// ThemeLearning.jsx - USING UNIVERSAL DESIGN SYSTEM
import React, { useState } from 'react';
import { useTheme } from './ThemeContext';
import ThemeToggle from './ThemeToggle';

const ThemeLearning = () => {
  const { isDarkMode, theme, toggleTheme } = useTheme();

  return (
    <div className="simple-container p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold simple-text mb-4">
          🎨 Simple Theme System
        </h1>
        <p className="simple-text-muted text-lg mb-4">
          One design system, automatic dark mode
        </p>
        <ThemeToggle />
      </div>

      {/* Demo Cards */}
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Card 1 */}
        <div className="simple-card">
          <h3 className="simple-text text-xl font-semibold mb-2">
            Magic Card 1
          </h3>
          <p className="simple-text-muted mb-4">
            This uses the UniversalReadMode design system. Current theme: <strong>{theme}</strong>
          </p>
          <button className="simple-btn" onClick={toggleTheme}>
            Toggle Theme
          </button>
        </div>

        {/* Card 2 */}
        <div className="simple-card">
          <h3 className="simple-text text-xl font-semibold mb-2">
            Magic Card 2
          </h3>
          <p className="simple-text-muted mb-4">
            Everything adapts automatically - no complex CSS needed!
          </p>
          <div className="flex gap-3">
            <button className="btn btn--primary">Design System Button</button>
            <button className="btn btn--secondary">Secondary</button>
          </div>
        </div>

        {/* Status Examples */}
        <div className="simple-card">
          <h3 className="simple-text text-xl font-semibold mb-4">Status Examples</h3>
          <div className="flex gap-3 flex-wrap">
            <span className="status status--success">Success</span>
            <span className="status status--warning">Warning</span>
            <span className="status status--error">Error</span>
            <span className="status status--info">Info</span>
          </div>
        </div>

        {/* Form Example */}
        <div className="simple-card">
          <h3 className="simple-text text-xl font-semibold mb-4">Form Elements</h3>
          <div className="form-group">
            <label className="form-label">Sample Input</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Type something..."
              defaultValue="Auto-themed input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Sample Select</label>
            <select className="form-control">
              <option>Option 1</option>
              <option>Option 2</option>
            </select>
          </div>
        </div>

        {/* Code Example */}
        <div className="simple-card">
          <h4 className="simple-text font-semibold mb-3">How to Use:</h4>
          <pre className="text-sm overflow-x-auto">
{`// Just use these classes anywhere:
<div className="simple-card">
  <h3 className="simple-text">Title</h3>
  <p className="simple-text-muted">Description</p>
  <button className="simple-btn">Button</button>
</div>`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ThemeLearning;
