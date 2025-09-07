// CycleReport.jsx - ENHANCED VERSION - Fixed low mastery flow
import React from 'react';
import { motion } from 'framer-motion';
import './UniversalReadMode.css';

const CycleReport = ({ 
  quizResults, 
  onContinue, 
  onBackToDashboard, 
  onStartLowMasteryReview, // NEW PROP
  isLowMasteryMode = false // NEW PROP
}) => {
  if (!quizResults || !quizResults.performance) {
    return (
      <div className="read-mode-container">
        <div className="read-mode-loading">
          <div className="loading-spinner">📊</div>
          <h2>Generating report...</h2>
        </div>
      </div>
    );
  }

  const { performance, attempts = [], sessionData = {} } = quizResults;
  
  // ✅ ENHANCED: Better low mastery detection
  const lowMasteryWords = attempts?.filter(attempt => {
    const finalMastery = attempt.mastery_after || attempt.mastery_before || 0;
    return finalMastery <= 0; // Words with mastery ≤ 0
  }) || [];

  const masteredWords = attempts?.filter(attempt => {
    const finalMastery = attempt.mastery_after || attempt.mastery_before || 0;
    return finalMastery >= 6; // Words with mastery ≥ 6 are considered mastered
  }) || [];

  const improvingWords = attempts?.filter(attempt => {
    const finalMastery = attempt.mastery_after || attempt.mastery_before || 0;
    return finalMastery > 0 && finalMastery < 6; // Words between 1-5 mastery
  }) || [];

  const correctAnswers = attempts?.filter(attempt => attempt.is_correct).length || 0;
  const totalQuestions = attempts?.length || 1;
  const accuracy = Math.round((correctAnswers / totalQuestions) * 100);

  // ✅ ENHANCED: Dynamic recommendations based on mode and performance
  const getRecommendations = () => {
    if (isLowMasteryMode) {
      if (lowMasteryWords.length === 0) {
        return {
          title: "🎉 Excellent Progress!",
          message: "You've successfully mastered all the difficult words in this review session.",
          action: "continue",
          buttonText: "Continue Learning"
        };
      } else {
        return {
          title: "📚 Keep Going!",
          message: `${lowMasteryWords.length} words still need more practice. Let's review them again.`,
          action: "repeat_low_mastery",
          buttonText: "Review Again"
        };
      }
    } else {
      if (lowMasteryWords.length === 0) {
        return {
          title: "🌟 Perfect Session!",
          message: "All words are progressing well. Great work!",
          action: "continue",
          buttonText: "Continue Learning"
        };
      } else {
        return {
          title: "🎯 Time for Focused Review",
          message: `${lowMasteryWords.length} words need extra attention. Let's give them focused practice.`,
          action: "start_low_mastery",
          buttonText: "Review Difficult Words"
        };
      }
    }
  };

  const recommendation = getRecommendations();

  // ✅ ENHANCED: Smart button handler
  const handleMainAction = () => {
    switch (recommendation.action) {
      case "start_low_mastery":
        // Start low mastery review with the specific words
        onStartLowMasteryReview?.(lowMasteryWords.map(attempt => attempt.word || attempt));
        break;
      case "repeat_low_mastery":
        // Repeat low mastery review
        onStartLowMasteryReview?.(lowMasteryWords.map(attempt => attempt.word || attempt));
        break;
      case "continue":
      default:
        onContinue();
        break;
    }
  };

  return (
    <div className="read-mode-container">
      <div className="read-mode-content">
        <motion.div 
          className="word-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="word-header bg-theme-accent">
            <div className="word-title text-white">
              {isLowMasteryMode ? "🔄 Review Results" : "📊 Session Complete"}
            </div>
            <div className="word-pronunciation text-white">
              {isLowMasteryMode ? "Low Mastery Review" : "Learning Progress"}
            </div>
          </div>

          {/* Main Content */}
          <div className="word-sections">
            {/* Overall Performance */}
            <div className="mb-8">
              <h3 className="text-2xl font-semibold mb-4">Overall Performance</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="simple-card text-center">
                  <div className="text-3xl font-bold text-accent">{accuracy}%</div>
                  <div className="text-sm text-muted">Accuracy</div>
                </div>
                <div className="simple-card text-center">
                  <div className="text-3xl font-bold text-accent">{correctAnswers}/{totalQuestions}</div>
                  <div className="text-sm text-muted">Correct Answers</div>
                </div>
              </div>
            </div>

            {/* Progress Breakdown */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Word Progress</h3>
              <div className="space-y-3">
                {masteredWords.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-success rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">✅</span>
                      <span className="font-medium">Mastered</span>
                    </div>
                    <span className="font-semibold">{masteredWords.length} words</span>
                  </div>
                )}
                
                {improvingWords.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-warning rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">📈</span>
                      <span className="font-medium">Improving</span>
                    </div>
                    <span className="font-semibold">{improvingWords.length} words</span>
                  </div>
                )}
                
                {lowMasteryWords.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-error rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">🎯</span>
                      <span className="font-medium">Need Practice</span>
                    </div>
                    <span className="font-semibold">{lowMasteryWords.length} words</span>
                  </div>
                )}
              </div>
            </div>

            {/* ✅ ENHANCED: Dynamic Recommendation */}
            <div className="mb-8">
              <div className="simple-card bg-theme-surface border-2 border-accent">
                <h3 className="text-lg font-semibold mb-2">{recommendation.title}</h3>
                <p className="text-secondary mb-4">{recommendation.message}</p>
                
                <div className="flex gap-3">
                  <button 
                    onClick={handleMainAction}
                    className="btn btn-primary flex-1"
                  >
                    {recommendation.buttonText}
                  </button>
                  
                  <button 
                    onClick={onBackToDashboard}
                    className="btn btn-outline"
                  >
                    Dashboard
                  </button>
                </div>
              </div>
            </div>

            {/* ✅ ENHANCED: Low Mastery Words List (when applicable) */}
            {lowMasteryWords.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Words Needing Review</h3>
                <div className="simple-card bg-theme-surface">
                  <div className="flex flex-wrap gap-2">
                    {lowMasteryWords.slice(0, 10).map((attempt, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-error text-white rounded-full text-sm"
                      >
                        {attempt.word || attempt.text || `Word ${index + 1}`}
                      </span>
                    ))}
                    {lowMasteryWords.length > 10 && (
                      <span className="px-3 py-1 bg-secondary rounded-full text-sm">
                        +{lowMasteryWords.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Session Stats */}
            {sessionData.session_id && (
              <div className="text-center text-sm text-secondary">
                <p>Session ID: {sessionData.session_id}</p>
                {sessionData.total_time && (
                  <p>Total Time: {Math.round(sessionData.total_time / 1000)}s</p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CycleReport;