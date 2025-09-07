// ThemeDebug.jsx - FOR TESTING
import React from 'react';
import { useTheme } from './ThemeContext';
import ThemeToggle from './ThemeToggle';

const ThemeDebug = () => {
  const { isDarkMode, theme } = useTheme();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Theme Debug Panel</h1>
      
      {/* Theme Toggle */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Theme Toggle</h2>
        <ThemeToggle showLabel debug />
      </div>

      {/* Color Swatches */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="theme-bg-primary p-4 rounded-lg theme-border border">
          <div className="font-medium">Primary BG</div>
          <div className="text-sm theme-text-muted">Background</div>
        </div>
        
        <div className="theme-bg-secondary p-4 rounded-lg theme-border border">
          <div className="font-medium">Secondary BG</div>
          <div className="text-sm theme-text-muted">Cards, panels</div>
        </div>
        
        <div className="theme-bg-tertiary p-4 rounded-lg theme-border border">
          <div className="font-medium">Tertiary BG</div>
          <div className="text-sm theme-text-muted">Subtle areas</div>
        </div>
        
        <div className="card p-4">
          <div className="font-medium">Card Style</div>
          <div className="text-sm theme-text-muted">Auto-themed</div>
        </div>
      </div>

      {/* Text Colors */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Text Colors</h2>
        <div className="theme-text-primary mb-2">Primary Text (main content)</div>
        <div className="theme-text-secondary mb-2">Secondary Text (subheadings)</div>
        <div className="theme-text-muted mb-2">Muted Text (captions)</div>
      </div>

      {/* Current State */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Current State</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Theme:</strong> {theme}</div>
          <div><strong>Dark Mode:</strong> {isDarkMode.toString()}</div>
          <div><strong>HTML Class:</strong> {document.documentElement.className}</div>
          <div><strong>Body Classes:</strong> {document.body.className}</div>
          <div><strong>Data Theme:</strong> {document.documentElement.getAttribute('data-theme')}</div>
          <div><strong>LocalStorage:</strong> {localStorage.getItem('theme')}</div>
        </div>
      
     
      
      
      
      </div>


      <div>
        <div className=" mt-8 p-4 theme-bg-secondary theme-border border rounded">
          <h2 className="text-xl font-semibold mb-4">Sample Card</h2>
          <p className="theme-text-primary mb-2">
            This is a sample card to demonstrate the current theme styles. The background, border, and text colors should adapt based on the selected theme and dark mode settings.
          </p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            Sample Button
          </button>
        </div>

      </div>
    </div>
  
    





);








};

export default ThemeDebug;
