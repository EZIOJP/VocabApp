// CycleLowMasteryMode.jsx - OPTIONAL DEDICATED COMPONENT for Low Mastery Cycles
import React, { useState, useCallback } from 'react';
import CycleReadMode from './CycleReadMode';
import CycleQuizMode from './CycleQuizMode_Enhanced';
import CycleReport from './CycleReport_Enhanced';

const LOW_MASTERY_STATES = {
  READING: 'reading',
  QUIZ: 'quiz',
  REPORT: 'report'
};

/**
 * Dedicated component for handling low mastery word cycles
 * This provides better separation of concerns and focused state management
 */
const CycleLowMasteryMode = ({ 
  initialWords,
  groupNumber,
  onComplete,
  onBackToDashboard
}) => {
  const [currentState, setCurrentState] = useState(LOW_MASTERY_STATES.READING);
  const [currentWords, setCurrentWords] = useState(initialWords || []);
  const [quizResults, setQuizResults] = useState(null);
  const [cycleCount, setCycleCount] = useState(1);
  const [allCycleResults, setAllCycleResults] = useState([]);

  // ✅ Transition to next state
  const transitionTo = useCallback((newState, data = {}) => {
    console.log(`🎯 LOW MASTERY TRANSITION: ${currentState} → ${newState}`, data);
    setCurrentState(newState);
  }, [currentState]);

  // ✅ Reading complete → Start quiz
  const handleReadingComplete = useCallback((wordsToQuiz) => {
    console.log('🔄 Low mastery reading complete, starting quiz');
    setCurrentWords(wordsToQuiz);
    transitionTo(LOW_MASTERY_STATES.QUIZ);
  }, [transitionTo]);

  // ✅ Quiz complete → Show report
  const handleQuizComplete = useCallback((results) => {
    console.log('🎯 Low mastery quiz complete');
    setQuizResults(results);
    setAllCycleResults(prev => [...prev, {
      cycleNumber: cycleCount,
      timestamp: Date.now(),
      results: results
    }]);
    transitionTo(LOW_MASTERY_STATES.REPORT);
  }, [transitionTo, cycleCount]);

  // ✅ Repeat low mastery cycle with remaining difficult words
  const handleRepeatCycle = useCallback((remainingLowMasteryWords) => {
    console.log('🔄 Repeating low mastery cycle', { 
      cycle: cycleCount + 1, 
      words: remainingLowMasteryWords.length 
    });
    
    setCurrentWords(remainingLowMasteryWords);
    setCycleCount(prev => prev + 1);
    transitionTo(LOW_MASTERY_STATES.READING);
  }, [transitionTo, cycleCount]);

  // ✅ Complete low mastery mode
  const handleComplete = useCallback(() => {
    console.log('✅ Low mastery mode completed successfully');
    onComplete({
      totalCycles: cycleCount,
      allResults: allCycleResults,
      finalWords: currentWords,
      completedAt: Date.now()
    });
  }, [onComplete, cycleCount, allCycleResults, currentWords]);

  // ✅ Render current state
  const renderCurrentState = () => {
    switch (currentState) {
      case LOW_MASTERY_STATES.READING:
        return (
          <CycleReadMode
            words={currentWords}
            groupNumber={groupNumber}
            isLowMastery={true}
            onComplete={handleReadingComplete}
            onBackToDashboard={onBackToDashboard}
            // ✅ Custom header for low mastery
            customHeader={{
              title: `🎯 Review Cycle ${cycleCount}`,
              subtitle: `Focusing on ${currentWords.length} challenging words`
            }}
          />
        );

      case LOW_MASTERY_STATES.QUIZ:
        return (
          <CycleQuizMode
            words={currentWords}
            groupNumber={groupNumber}
            isLowMastery={true}
            onComplete={handleQuizComplete}
            onBackToDashboard={onBackToDashboard}
          />
        );

      case LOW_MASTERY_STATES.REPORT:
        return (
          <CycleReport
            quizResults={quizResults}
            isLowMasteryMode={true}
            onContinue={handleComplete}
            onBackToDashboard={onBackToDashboard}
            onStartLowMasteryReview={handleRepeatCycle}
            // ✅ Custom data for low mastery context
            customData={{
              cycleNumber: cycleCount,
              totalCycles: allCycleResults.length,
              previousResults: allCycleResults
            }}
          />
        );

      default:
        return (
          <div className="read-mode-error">
            <h2>Invalid Low Mastery State</h2>
            <p>State: {currentState}</p>
            <button onClick={onBackToDashboard} className="btn btn-primary">
              Back to Dashboard
            </button>
          </div>
        );
    }
  };

  return (
    <div className="cycle-low-mastery-mode">
      {renderCurrentState()}

      {/* ✅ Low mastery progress indicator */}
      <div className="low-mastery-progress" style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        background: 'rgba(255, 107, 107, 0.9)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: 'bold',
        zIndex: 100
      }}>
        🎯 Review Cycle {cycleCount} • {currentWords.length} words
      </div>
    </div>
  );
};

export default CycleLowMasteryMode;