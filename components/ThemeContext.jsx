// ThemeContext.jsx - FIXED VERSION
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    // Use data-color-scheme attribute (what UniversalReadMode.css expects)
    document.documentElement.setAttribute('data-color-scheme', isDarkMode ? 'dark' : 'light');
    // Also add class for compatibility
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ThemeContext.Provider value={{ 
      isDarkMode, 
      theme: isDarkMode ? 'dark' : 'light',
      toggleTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
