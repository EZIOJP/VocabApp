// CycleManager.jsx - MAIN CYCLE CONTROLLER - Proper flow management
import React, { useState, useCallback } from 'react';
import CycleReadMode from './CycleReadMode';
import CycleQuizMode from './CycleQuizMode_Enhanced';
import CycleReport from './CycleReport_Enhanced';
import CycleDashboard from './CycleDashboard';

// ✅ CYCLE STATES - Clear state machine
const CYCLE_STATES = {
  DASHBOARD: 'dashboard',
  READING: 'reading',
  QUIZ: 'quiz', 
  REPORT: 'report',
  LOW_MASTERY_READING: 'low_mastery_reading',
  LOW_MASTERY_QUIZ: 'low_mastery_quiz',
  LOW_MASTERY_REPORT: 'low_mastery_report'
};

const CycleManager = () => {
  // ✅ ENHANCED STATE MANAGEMENT
  const [currentState, setCurrentState] = useState(CYCLE_STATES.DASHBOARD);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [currentWords, setCurrentWords] = useState([]);
  const [lowMasteryWords, setLowMasteryWords] = useState([]);
  const [quizResults, setQuizResults] = useState(null);
  const [cycleHistory, setCycleHistory] = useState([]); // Track cycle history for debugging

  // ✅ ENHANCED: Transition logger for debugging
  const transitionTo = useCallback((newState, data = {}) => {
    console.log(`🔄 CYCLE TRANSITION: ${currentState} → ${newState}`, data);
    
    setCycleHistory(prev => [...prev, {
      from: currentState,
      to: newState,
      timestamp: Date.now(),
      data: data
    }]);
    
    setCurrentState(newState);
  }, [currentState]);

  // ✅ DASHBOARD: Start regular cycle
  const handleStartCycle = useCallback((groupData) => {
    console.log('📚 Starting cycle for group:', groupData.groupNumber);
    setCurrentGroup(groupData);
    setCurrentWords(groupData.words || []);
    setLowMasteryWords([]);
    setQuizResults(null);
    transitionTo(CYCLE_STATES.READING, { groupNumber: groupData.groupNumber });
  }, [transitionTo]);

  // ✅ READING: Complete reading → Start quiz
  const handleReadingComplete = useCallback((wordsToQuiz) => {
    console.log('📖 Reading complete, starting quiz with', wordsToQuiz.length, 'words');
    setCurrentWords(wordsToQuiz);
    transitionTo(CYCLE_STATES.QUIZ, { wordsCount: wordsToQuiz.length });
  }, [transitionTo]);

  // ✅ QUIZ: Complete quiz → Show report
  const handleQuizComplete = useCallback((results) => {
    console.log('🧠 Quiz complete, showing report');
    setQuizResults(results);
    transitionTo(CYCLE_STATES.REPORT, { 
      accuracy: results.attempts ? Math.round((results.attempts.filter(a => a.is_correct).length / results.attempts.length) * 100) : 0 
    });
  }, [transitionTo]);

  // ✅ REPORT: Start low mastery review
  const handleStartLowMasteryReview = useCallback((lowMasteryWordsList) => {
    console.log('🎯 Starting low mastery review with', lowMasteryWordsList.length, 'words');
    setLowMasteryWords(lowMasteryWordsList);
    setCurrentWords(lowMasteryWordsList);
    transitionTo(CYCLE_STATES.LOW_MASTERY_READING, { lowMasteryCount: lowMasteryWordsList.length });
  }, [transitionTo]);

  // ✅ LOW MASTERY READING: Complete → Low mastery quiz  
  const handleLowMasteryReadingComplete = useCallback((wordsToQuiz) => {
    console.log('🔄 Low mastery reading complete, starting low mastery quiz');
    setCurrentWords(wordsToQuiz);
    transitionTo(CYCLE_STATES.LOW_MASTERY_QUIZ, { lowMasteryQuizCount: wordsToQuiz.length });
  }, [transitionTo]);

  // ✅ LOW MASTERY QUIZ: Complete → Low mastery report
  const handleLowMasteryQuizComplete = useCallback((results) => {
    console.log('🎯 Low mastery quiz complete, showing low mastery report');
    setQuizResults(results);
    transitionTo(CYCLE_STATES.LOW_MASTERY_REPORT, { 
      lowMasteryResults: true,
      remainingLowMastery: results.attempts ? results.attempts.filter(a => (a.mastery_after || 0) <= 0).length : 0
    });
  }, [transitionTo]);

  // ✅ UNIVERSAL: Continue learning (next group or back to dashboard)
  const handleContinue = useCallback(() => {
    console.log('➡️ Continuing to next learning phase');
    // Could implement next group logic here
    transitionTo(CYCLE_STATES.DASHBOARD);
  }, [transitionTo]);

  // ✅ UNIVERSAL: Back to dashboard
  const handleBackToDashboard = useCallback(() => {
    console.log('🏠 Returning to dashboard');
    // Reset all state
    setCurrentGroup(null);
    setCurrentWords([]);
    setLowMasteryWords([]);
    setQuizResults(null);
    transitionTo(CYCLE_STATES.DASHBOARD);
  }, [transitionTo]);

  // ✅ RENDER CURRENT STATE
  const renderCurrentState = () => {
    switch (currentState) {
      case CYCLE_STATES.DASHBOARD:
        return (
          <CycleDashboard 
            onStartCycle={handleStartCycle}
          />
        );

      case CYCLE_STATES.READING:
        return (
          <CycleReadMode
            words={currentWords}
            groupNumber={currentGroup?.groupNumber}
            isLowMastery={false}
            onComplete={handleReadingComplete}
            onBackToDashboard={handleBackToDashboard}
          />
        );

      case CYCLE_STATES.QUIZ:
        return (
          <CycleQuizMode
            words={currentWords}
            groupNumber={currentGroup?.groupNumber}
            isLowMastery={false}
            onComplete={handleQuizComplete}
            onBackToDashboard={handleBackToDashboard}
          />
        );

      case CYCLE_STATES.REPORT:
        return (
          <CycleReport
            quizResults={quizResults}
            isLowMasteryMode={false}
            onContinue={handleContinue}
            onBackToDashboard={handleBackToDashboard}
            onStartLowMasteryReview={handleStartLowMasteryReview}
          />
        );

      case CYCLE_STATES.LOW_MASTERY_READING:
        return (
          <CycleReadMode
            words={currentWords}
            groupNumber={currentGroup?.groupNumber}
            isLowMastery={true}
            onComplete={handleLowMasteryReadingComplete}
            onBackToDashboard={handleBackToDashboard}
          />
        );

      case CYCLE_STATES.LOW_MASTERY_QUIZ:
        return (
          <CycleQuizMode
            words={currentWords}
            groupNumber={currentGroup?.groupNumber}
            isLowMastery={true}
            onComplete={handleLowMasteryQuizComplete}
            onBackToDashboard={handleBackToDashboard}
          />
        );

      case CYCLE_STATES.LOW_MASTERY_REPORT:
        return (
          <CycleReport
            quizResults={quizResults}
            isLowMasteryMode={true}
            onContinue={handleContinue}
            onBackToDashboard={handleBackToDashboard}
            onStartLowMasteryReview={handleStartLowMasteryReview}
          />
        );

      default:
        console.error('Unknown cycle state:', currentState);
        return (
          <div className="read-mode-container">
            <div className="read-mode-error">
              <h2>Invalid State</h2>
              <p>Unknown cycle state: {currentState}</p>
              <button onClick={handleBackToDashboard} className="btn btn-primary">
                Return to Dashboard
              </button>
            </div>
          </div>
        );
    }
  };

  // ✅ DEBUG PANEL (only in development)
  const isDebugMode = process.env.NODE_ENV === 'development';

  return (
    <div className="cycle-manager">
      {renderCurrentState()}
      
      {/* ✅ DEVELOPMENT DEBUG PANEL */}
      {isDebugMode && (
        <div className="debug-panel" style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px',
          maxWidth: '300px',
          zIndex: 9999
        }}>
          <div><strong>State:</strong> {currentState}</div>
          <div><strong>Group:</strong> {currentGroup?.groupNumber || 'None'}</div>
          <div><strong>Words:</strong> {currentWords.length}</div>
          <div><strong>Low Mastery:</strong> {lowMasteryWords.length}</div>
          {cycleHistory.length > 0 && (
            <div><strong>Last Transition:</strong> {cycleHistory[cycleHistory.length - 1]?.to}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default CycleManager;