import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from './ThemeContext';

const ThemeToggle = ({ className = "", size = "md",showLabel = false, debug = false  }) => {
  const { isDarkMode, toggleTheme , theme, isLoading} = useTheme();

  const sizes = {
    sm: "w-12 h-6",
    md: "w-14 h-7", 
    lg: "w-16 h-8"
  };

  const thumbSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };
 if (isLoading) {
    return (
      <div className={`${sizes[size].container} bg-gray-300 rounded-full animate-pulse ${className}`} />
    );
  }
  
  
  return (
    <button
      onClick={toggleTheme}
      className={`${sizes[size]} ${className} relative rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 ${
        isDarkMode 
          ? 'bg-gradient-to-r from-blue-600 to-purple-600' 
          : 'bg-gradient-to-r from-yellow-400 to-orange-500'
      }`}
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      {/* Track */}
      <div className="w-full h-full rounded-full relative overflow-hidden">
        {/* Animated background elements */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${
          isDarkMode ? 'opacity-100' : 'opacity-0'
        }`}>
          {/* Stars for dark mode */}
          <div className="absolute top-0.5 left-1 w-1 h-1 bg-white rounded-full opacity-70"></div>
          <div className="absolute top-1 right-2 w-0.5 h-0.5 bg-white rounded-full opacity-50"></div>
          <div className="absolute bottom-1 left-2 w-0.5 h-0.5 bg-white rounded-full opacity-60"></div>
        </div>
        
        <div className={`absolute inset-0 transition-opacity duration-300 ${
          isDarkMode ? 'opacity-0' : 'opacity-100'
        }`}>
          {/* Clouds for light mode */}
          <div className="absolute top-1 left-1 w-2 h-1 bg-white rounded-full opacity-50"></div>
          <div className="absolute top-0.5 right-1.5 w-1.5 h-0.5 bg-white rounded-full opacity-40"></div>
        </div>
      </div>

      {/* Thumb */}
      <motion.div
        className={`${thumbSizes[size]} absolute top-1 bg-white rounded-full shadow-lg flex items-center justify-center`}
        animate={{
          x: isDarkMode ? `calc(100% + 0.125rem)` : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
      >
        <motion.div
          animate={{ rotate: isDarkMode ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {isDarkMode ? (
            // Moon icon
            <svg className="w-3 h-3 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" clipRule="evenodd" />
            </svg>
          ) : (
            // Sun icon
            <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
          )}
        </motion.div>
      </motion.div>
    </button>
  );
};

export default ThemeToggle;