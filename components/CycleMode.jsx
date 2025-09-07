// CycleMode.jsx - FINAL VERSION - Main orchestrator for complete cycle
import React, { useState, useCallback } from 'react';
import CycleDashboard from './CycleDashboard';
import CycleReadMode from './CycleReadMode';
import CycleQuizMode from './CycleQuizMode';
import CycleReport from './CycleReport';
import LowMasteryPrompt from './LowMasteryPrompt';
import './UniversalReadMode.css';

// Cycle phases
const PHASES = {
  DASHBOARD: 'dashboard',
  READING: 'reading',
  QUIZ: 'quiz',
  REPORT: 'report',
  LOW_MASTERY_PROMPT: 'low_mastery_prompt',
  LOW_MASTERY_READ: 'low_mastery_read',
  LOW_MASTERY_QUIZ: 'low_mastery_quiz'
};

const CycleMode = () => {
  const [currentPhase, setCurrentPhase] = useState(PHASES.DASHBOARD);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [cycleData, setCycleData] = useState({
    readWords: [],
    quizResults: null,
    lowMasteryWords: [],
    completedCycles: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  // 1. START CYCLE - From dashboard
  const handleStartCycle = useCallback((groupData) => {
    setCurrentGroup(groupData);
    setCycleData({
      readWords: [],
      quizResults: null,
      lowMasteryWords: [],
      completedCycles: 0
    });
    setCurrentPhase(PHASES.READING);
  }, []);

  // 2. READING COMPLETE - Start quiz
  const handleReadingComplete = useCallback((readWords) => {
    setCycleData(prev => ({
      ...prev,
      readWords
    }));
    setCurrentPhase(PHASES.QUIZ);
  }, []);

  // 3. QUIZ COMPLETE - Show report
  const handleQuizComplete = useCallback((quizResults) => {
    setCycleData(prev => ({
      ...prev,
      quizResults,
      completedCycles: prev.completedCycles + 1
    }));
    setCurrentPhase(PHASES.REPORT);
  }, []);

  // 4. REPORT COMPLETE - Check low mastery
  const handleReportContinue = useCallback((lowMasteryWords) => {
    setCycleData(prev => ({
      ...prev,
      lowMasteryWords
    }));

    if (lowMasteryWords && lowMasteryWords.length > 0) {
      setCurrentPhase(PHASES.LOW_MASTERY_PROMPT);
    } else {
      // No low mastery words, return to dashboard
      setCurrentPhase(PHASES.DASHBOARD);
    }
  }, []);

  // 5. LOW MASTERY DECISION
  const handleLowMasteryDecision = useCallback((shouldRepeat) => {
    if (shouldRepeat && cycleData.completedCycles < 5) {
      setCurrentPhase(PHASES.LOW_MASTERY_READ);
    } else {
      // Skip or max cycles reached
      setCurrentPhase(PHASES.DASHBOARD);
    }
  }, [cycleData.completedCycles]);

  // 6. LOW MASTERY READING COMPLETE
  const handleLowMasteryReadComplete = useCallback((words) => {
    setCurrentPhase(PHASES.LOW_MASTERY_QUIZ);
  }, []);

  // 7. LOW MASTERY QUIZ COMPLETE
  const handleLowMasteryQuizComplete = useCallback((quizResults) => {
    // Find words that are still low mastery
    const stillLowMastery = quizResults.attempts?.filter(
      attempt => attempt.mastery_after <= 0
    ) || [];

    setCycleData(prev => ({
      ...prev,
      quizResults,
      lowMasteryWords: stillLowMastery,
      completedCycles: prev.completedCycles + 1
    }));

    // Check if we should continue or stop
    if (stillLowMastery.length > 0 && cycleData.completedCycles < 5) {
      setCurrentPhase(PHASES.LOW_MASTERY_PROMPT);
    } else {
      // All done or max cycles
      setCurrentPhase(PHASES.DASHBOARD);
    }
  }, [cycleData.completedCycles]);

  // BACK TO DASHBOARD
  const handleBackToDashboard = useCallback(() => {
    setCurrentPhase(PHASES.DASHBOARD);
    setCurrentGroup(null);
    setCycleData({
      readWords: [],
      quizResults: null,
      lowMasteryWords: [],
      completedCycles: 0
    });
  }, []);

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner">🔄</div>
          <p className="text-primary mt-4">Processing...</p>
        </div>
      </div>
    );
  }

  // RENDER CURRENT PHASE
  switch (currentPhase) {
    case PHASES.DASHBOARD:
      return <CycleDashboard onStartCycle={handleStartCycle} />;
      
    case PHASES.READING:
      return (
        <CycleReadMode
          words={currentGroup?.words || []}
          groupNumber={currentGroup?.groupNumber}
          isLowMastery={false}
          onComplete={handleReadingComplete}
          onBackToDashboard={handleBackToDashboard}
        />
      );
      
    case PHASES.QUIZ:
      return (
        <CycleQuizMode
          words={cycleData.readWords}
          groupNumber={currentGroup?.groupNumber}
          isLowMastery={false}
          onComplete={handleQuizComplete}
          onBackToDashboard={handleBackToDashboard}
        />
      );
      
    case PHASES.REPORT:
      return (
        <CycleReport
          quizResults={cycleData.quizResults}
          onContinue={handleReportContinue}
          onBackToDashboard={handleBackToDashboard}
        />
      );
      
    case PHASES.LOW_MASTERY_PROMPT:
      return (
        <LowMasteryPrompt
          lowMasteryWords={cycleData.lowMasteryWords}
          cycleCount={cycleData.completedCycles}
          onDecision={handleLowMasteryDecision}
          onBackToDashboard={handleBackToDashboard}
        />
      );
      
    case PHASES.LOW_MASTERY_READ:
      return (
        <CycleReadMode
          words={cycleData.lowMasteryWords}
          groupNumber={currentGroup?.groupNumber}
          isLowMastery={true}
          onComplete={handleLowMasteryReadComplete}
          onBackToDashboard={handleBackToDashboard}
        />
      );
      
    case PHASES.LOW_MASTERY_QUIZ:
      return (
        <CycleQuizMode
          words={cycleData.lowMasteryWords}
          groupNumber={currentGroup?.groupNumber}
          isLowMastery={true}
          onComplete={handleLowMasteryQuizComplete}
          onBackToDashboard={handleBackToDashboard}
        />
      );
      
    default:
      return <CycleDashboard onStartCycle={handleStartCycle} />;
  }
};

export default CycleMode;