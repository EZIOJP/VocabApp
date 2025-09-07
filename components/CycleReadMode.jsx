// CycleReadMode.jsx - FINAL VERSION - Reading without marking as read
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const CycleReadMode = ({ words, groupNumber, isLowMastery = false, onComplete, onBackToDashboard }) => {
  const [index, setIndex] = useState(0);
  const [showUI, setShowUI] = useState(true);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef(null);
  const hideUITimeout = useRef(null);

  const resetHideTimer = useCallback(() => {
    setShowUI(true);
    clearTimeout(hideUITimeout.current);
    hideUITimeout.current = setTimeout(() => setShowUI(false), 4000);
  }, []);

  const handleSwipe = useCallback((swipeDirection) => {
    if (!words.length) return;
    
    const newIndex = index + swipeDirection;
    
    if (newIndex >= words.length) {
      // Reading complete - pass words to quiz
      onComplete(words);
      return;
    }
    
    if (newIndex < 0) return;
    
    setDirection(swipeDirection);
    setIndex(newIndex);
    resetHideTimer();
  }, [index, words, onComplete, resetHideTimer]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSwipe, resetHideTimer, onBackToDashboard]);

  // Touch/Mouse handlers
  useEffect(() => {
    const handleMouseMove = () => resetHideTimer();
    
    const handleClick = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      
      if (e.target.closest('.cycle-header') || e.target.closest('.cycle-navigation')) return;
      
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
      
      if (Math.abs(diffX) > 50) {
        handleSwipe(diffX > 0 ? 1 : -1);
      }
      touchStartX = 0;
    };

    window.addEventListener('mousemove', handleMouseMove);
    const container = containerRef.current;
    if (container) {
      container.addEventListener('click', handleClick);
      container.addEventListener('touchstart', handleTouchStart);
      container.addEventListener('touchend', handleTouchEnd);
    }
    
    resetHideTimer();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (container) {
        container.removeEventListener('click', handleClick);
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchend', handleTouchEnd);
      }
      clearTimeout(hideUITimeout.current);
    };
  }, [handleSwipe, resetHideTimer]);

  if (!words || !words.length) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-primary mb-2">No Words Available</h2>
          <button className="btn btn-primary" onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentWord = words[index];
  const progress = ((index + 1) / words.length) * 100;

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
                  {isLowMastery ? 'Low Mastery Review' : `Group ${groupNumber} - Reading`}
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-secondary">
                  {index + 1} / {words.length}
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
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 30
            }}
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
                  <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
                    <p className="text-lg font-medium text-primary">
                      {currentWord.meaning}
                    </p>
                  </div>
                </div>

                {/* Word Details */}
                <div className="space-y-6">
                  {/* Examples */}
                  {currentWord.examples && currentWord.examples.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-3">Examples:</h3>
                      <div className="space-y-2">
                        {currentWord.examples.slice(0, 2).map((example, idx) => (
                          <div key={idx} className="p-3 bg-secondary/20 rounded-lg">
                            <p className="text-secondary italic">
                              "{typeof example === 'string' ? example : example.text}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Synonyms */}
                  {currentWord.synonyms && currentWord.synonyms.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-2">Synonyms:</h3>
                      <div className="flex flex-wrap gap-2">
                        {currentWord.synonyms.map((synonym, idx) => (
                          <span key={idx} className="px-3 py-1 bg-success/20 text-success rounded-full text-sm">
                            {synonym}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Antonyms */}
                  {currentWord.antonyms && currentWord.antonyms.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-2">Antonyms:</h3>
                      <div className="flex flex-wrap gap-2">
                        {currentWord.antonyms.map((antonym, idx) => (
                          <span key={idx} className="px-3 py-1 bg-error/20 text-error rounded-full text-sm">
                            {antonym}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Etymology */}
                  {currentWord.etymology && (
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-2">Etymology:</h3>
                      <p className="text-secondary">{currentWord.etymology}</p>
                    </div>
                  )}

                  {/* Story Mnemonic */}
                  {currentWord.story_mnemonic && (
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-2">Memory Aid:</h3>
                      <p className="text-secondary italic">{currentWord.story_mnemonic}</p>
                    </div>
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
                  {index === words.length - 1 ? 'Start Quiz' : 'Next Word'}
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

export default CycleReadMode;