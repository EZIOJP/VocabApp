// ReadModeForCycle.jsx - Read mode for cycle (NO marking as read)
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from './ThemeContext';
import InfoGrid from './InfoGrid';
import Examples from './Examples';
import PillList from './PillList';
import Links from './Links';
import './UniversalReadMode.css';

const pageVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  })
};

const pageTransition = {
  type: "spring",
  stiffness: 280,
  damping: 30
};

const ReadModeForCycle = ({ 
  groupNumber, 
  words, 
  isLowMasteryMode = false,
  onComplete, 
  onBackToDashboard 
}) => {
  const [allWords, setAllWords] = useState([]);
  const [index, setIndex] = useState(0);
  const [showUI, setShowUI] = useState(true);
  const [direction, setDirection] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const containerRef = useRef(null);
  const hideUITimeout = useRef(null);

  const resetHideTimer = useCallback(() => {
    setShowUI(true);
    clearTimeout(hideUITimeout.current);
    hideUITimeout.current = setTimeout(() => setShowUI(false), 4000);
  }, []);

  // Load words based on mode
  useEffect(() => {
    const loadWords = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        let wordsData;
        
        if (words && words.length > 0) {
          // Use provided words (for low mastery mode)
          wordsData = words;
        } else if (groupNumber) {
          // Load group words
          const response = await fetch(`/api/words/by-criteria/?group=${groupNumber}&limit=30`);
          const data = await response.json();
          wordsData = data.words || [];
        } else {
          throw new Error('No words or group specified');
        }
        
        setAllWords(wordsData);
        setIndex(0);
      } catch (e) {
        console.error('Error loading words:', e);
        setError(e.message || 'Failed to load words');
      } finally {
        setIsLoading(false);
      }
    };

    loadWords();
  }, [groupNumber, words]);

  // Navigation handler
  const handleSwipe = useCallback((swipeDirection) => {
    if (!allWords.length) return;
    
    const newIndex = index + swipeDirection;
    
    // Check if we've reached the end
    if (newIndex >= allWords.length) {
      onComplete(allWords);
      return;
    }
    
    // Check if going before start
    if (newIndex < 0) {
      return;
    }
    
    setDirection(swipeDirection);
    setIndex(newIndex);
    resetHideTimer();
  }, [index, allWords, onComplete, resetHideTimer]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      resetHideTimer();
      
      switch (e.key.toLowerCase()) {
        case 'arrowleft':
        case 'h':
        case 'a':
          e.preventDefault();
          handleSwipe(-1);
          break;
        case 'arrowright':
        case ' ':
        case 'l':
        case 'd':
          e.preventDefault();
          handleSwipe(1);
          break;
        case 'escape':
          e.preventDefault();
          onBackToDashboard();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSwipe, resetHideTimer, onBackToDashboard]);

  // Touch and mouse handlers
  useEffect(() => {
    const handleMouseMove = () => resetHideTimer();
    
    const handleClick = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      
      if (e.target.closest('.cycle-header') || e.target.closest('.cycle-navigation')) {
        return;
      }
      
      const thirdWidth = rect.width / 3;
      if (clickX < thirdWidth) {
        handleSwipe(-1);
      } else if (clickX > thirdWidth * 2) {
        handleSwipe(1);
      } else {
        setShowUI(prev => !prev);
      }
    };

    let touchStartX = 0;
    const handleTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      resetHideTimer();
    };
    
    const handleTouchEnd = (e) => {
      if (!touchStartX) return;
      const touchEndX = e.changedTouches[0].clientX;
      const diffX = touchStartX - touchEndX;
      const minSwipeDistance = 50;
      
      if (Math.abs(diffX) > minSwipeDistance) {
        if (diffX > 0) {
          handleSwipe(1);
        } else {
          handleSwipe(-1);
        }
      }
      touchStartX = 0;
    };

    window.addEventListener('mousemove', handleMouseMove);
    const currentContainer = containerRef.current;
    currentContainer?.addEventListener('click', handleClick);
    currentContainer?.addEventListener('touchstart', handleTouchStart);
    currentContainer?.addEventListener('touchend', handleTouchEnd);
    
    resetHideTimer();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (currentContainer) {
        currentContainer.removeEventListener('click', handleClick);
        currentContainer.removeEventListener('touchstart', handleTouchStart);
        currentContainer.removeEventListener('touchend', handleTouchEnd);
      }
      clearTimeout(hideUITimeout.current);
    };
  }, [handleSwipe, resetHideTimer]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner">📖</div>
          <p className="text-primary mt-4">Loading words for reading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-primary mb-2">Error Loading Words</h2>
          <p className="text-secondary mb-4">{error}</p>
          <button className="btn btn-primary" onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!allWords.length) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-primary mb-2">No Words Available</h2>
          <p className="text-secondary mb-4">No words found for this selection.</p>
          <button className="btn btn-primary" onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentWord = allWords[index];
  const progress = ((index + 1) / allWords.length) * 100;

  return (
    <div ref={containerRef} className="read-mode-container min-h-screen bg-primary relative overflow-hidden">
      {/* Header */}
      <AnimatePresence>
        {showUI && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="cycle-header absolute top-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-sm border-b border-card"
          >
            <div className="flex justify-between items-center p-4">
              <div className="flex items-center gap-4">
                <button 
                  className="btn btn-secondary"
                  onClick={onBackToDashboard}
                >
                  ← Dashboard
                </button>
                <h1 className="text-lg font-semibold text-primary">
                  {isLowMasteryMode ? 'Low Mastery Review' : `Group ${groupNumber} - Reading`}
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-secondary">
                  {index + 1} / {allWords.length}
                </span>
                <div className="w-32 bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Word Content */}
      <div className="pt-20 pb-20">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={index}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={pageTransition}
            className="container mx-auto px-4"
          >
            <div className="max-w-4xl mx-auto">
              <div className="card p-8 mb-6">
                {/* Word Header */}
                <div className="text-center mb-8">
                  <h1 className="text-4xl md:text-6xl font-bold text-primary mb-2">
                    {currentWord.word}
                  </h1>
                  {currentWord.pronunciation && (
                    <p className="text-xl text-secondary">
                      /{currentWord.pronunciation}/
                    </p>
                  )}
                  <div className="mt-4 p-3 bg-secondary/50 rounded-lg">
                    <p className="text-lg font-medium text-primary">
                      {currentWord.meaning}
                    </p>
                  </div>
                </div>

                {/* Word Details */}
                <div className="space-y-6">
                  {currentWord.examples && currentWord.examples.length > 0 && (
                    <Examples examples={currentWord.examples} />
                  )}
                  
                  {currentWord.synonyms && currentWord.synonyms.length > 0 && (
                    <PillList title="Synonyms" items={currentWord.synonyms} />
                  )}
                  
                  {currentWord.antonyms && currentWord.antonyms.length > 0 && (
                    <PillList title="Antonyms" items={currentWord.antonyms} />
                  )}
                  
                  {currentWord.etymology && (
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-2">Etymology</h3>
                      <p className="text-secondary">{currentWord.etymology}</p>
                    </div>
                  )}
                  
                  {currentWord.external_links && Object.keys(currentWord.external_links).length > 0 && (
                    <Links links={currentWord.external_links} />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <AnimatePresence>
        {showUI && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="cycle-navigation fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-sm border-t border-card"
          >
            <div className="flex justify-center items-center p-4 gap-6">
              <div className="text-center">
                <div className="text-sm text-secondary">← Previous</div>
                <div className="text-xs text-secondary">H, A, ←</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-primary font-medium">
                  {index === allWords.length - 1 ? 'Complete Reading' : 'Next Word'}
                </div>
                <div className="text-xs text-secondary">Space, D, →</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-secondary">ESC to Exit</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReadModeForCycle;