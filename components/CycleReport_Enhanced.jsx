// CycleReport_Enhanced.jsx - FULLY REFACTORED VERSION - Complete low mastery flow
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import './UniversalReadMode.css';
import { API_BASE_URL } from "../apiConfig";

const CycleReport = ({ 
  quizResults, 
  onContinue, 
  onBackToDashboard, 
  onStartLowMasteryReview, 
  isLowMasteryMode = false 
}) => {
  const [isLoadingLowMastery, setIsLoadingLowMastery] = useState(false);

  // ✅ SAFETY CHECK: Ensure we have valid quiz results
  if (!quizResults || !quizResults.performance) {
    return (
      <div className="read-mode-container">
        <div className="read-mode-error">
          <h2>Report Error</h2>
          <p>No quiz results available to display.</p>
          <button onClick={onBackToDashboard} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ✅ EXTRACT PERFORMANCE DATA
  const performance = quizResults.performance || {};
  const attempts = quizResults.attempts || [];
  const sessionData = quizResults.sessionData || {};

  // ✅ CALCULATE KEY METRICS
  const totalQuestions = performance.total_questions || 0;
  const correctAnswers = performance.correct_answers || 0;
  const accuracyRate = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const wordsImproved = attempts.filter(attempt => 
    (attempt.mastery_after || 0) > (attempt.mastery_before || 0)
  ).length;

  // ✅ LOW MASTERY WORD DETECTION
  const getLowMasteryWords = () => {
    if (!attempts || attempts.length === 0) return [];
    
    // Words with mastery <= 0 after the quiz
    const lowMasteryAttempts = attempts.filter(attempt => 
      (attempt.mastery_after || 0) <= 0
    );
    
    return lowMasteryAttempts.map(attempt => ({
      id: attempt.word_id,
      word: attempt.word,
      mastery: attempt.mastery_after,
      meaning: attempt.correct_answer,
      pronunciation: attempt.pronunciation || '',
      examples: attempt.examples || [],
      is_correct: attempt.is_correct
    }));
  };

  const lowMasteryWords = getLowMasteryWords();
  const lowMasteryCount = lowMasteryWords.length;

  // ✅ START LOW MASTERY REVIEW WITH API CALL
  const handleStartLowMastery = async () => {
    if (lowMasteryCount === 0) {
      onContinue();
      return;
    }

    setIsLoadingLowMastery(true);
    
    try {
      // ✅ FETCH FULL WORD DATA for low mastery words
      const wordIds = lowMasteryWords.map(w => w.id).join(',');
      console.log('🎯 Fetching low mastery words:', wordIds);
      
      const response = await fetch(
        `${API_BASE_URL}/words/by-criteria/?word_ids=${wordIds}&mastery_max=0&limit=50`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Low mastery words fetched:', data.words.length);
        onStartLowMasteryReview(data.words || lowMasteryWords);
      } else {
        console.warn('⚠️ API failed, using basic word data');
        onStartLowMasteryReview(lowMasteryWords);
      }
    } catch (error) {
      console.error('❌ Failed to fetch low mastery words:', error);
      onStartLowMasteryReview(lowMasteryWords);
    } finally {
      setIsLoadingLowMastery(false);
    }
  };

  // ✅ PERFORMANCE LEVEL CALCULATION
  const getPerformanceLevel = () => {
    if (accuracyRate >= 90) return { level: 'Excellent', color: 'text-success', emoji: '🌟' };
    if (accuracyRate >= 75) return { level: 'Good', color: 'text-success', emoji: '✅' };
    if (accuracyRate >= 60) return { level: 'Fair', color: 'text-warning', emoji: '⚡' };
    return { level: 'Needs Practice', color: 'text-error', emoji: '🎯' };
  };

  const performanceLevel = getPerformanceLevel();

  // ✅ RENDER MASTERY CHANGES
  const renderMasteryChanges = () => {
    const masteryChanges = attempts.filter(attempt => 
      attempt.mastery_before !== attempt.mastery_after
    );

    if (masteryChanges.length === 0) return null;

    return (
      <div className="mastery-changes-section">
        <h3>📈 Mastery Changes</h3>
        <div className="mastery-changes-grid">
          {masteryChanges.slice(0, 6).map((attempt, index) => (
            <div key={index} className="mastery-change-item">
              <div className="word-name">{attempt.word}</div>
              <div className="mastery-progression">
                <span className={`mastery-before ${attempt.mastery_before <= 0 ? 'negative' : ''}`}>
                  {attempt.mastery_before}
                </span>
                <span className="mastery-arrow">→</span>
                <span className={`mastery-after ${attempt.mastery_after <= 0 ? 'negative' : ''}`}>
                  {attempt.mastery_after}
                </span>
              </div>
            </div>
          ))}
        </div>
        {masteryChanges.length > 6 && (
          <p className="more-changes">
            +{masteryChanges.length - 6} more words improved
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="read-mode-container">
      {/* Header */}
      <div className="read-mode-header">
        <div className="read-mode-title">
          <h1>
            {isLowMasteryMode ? '🎯 Low Mastery Review Complete' : '📊 Quiz Report'}
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="read-mode-content">
        <motion.div
          className="report-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Performance Overview */}
          <div className="performance-overview">
            <div className="performance-header">
              <div className="performance-emoji">{performanceLevel.emoji}</div>
              <div className="performance-details">
                <h2 className={performanceLevel.color}>{performanceLevel.level}</h2>
                <p>{accuracyRate}% Accuracy</p>
              </div>
            </div>

            <div className="performance-stats">
              <div className="stat-item">
                <span className="stat-label">Questions</span>
                <span className="stat-value">{totalQuestions}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Correct</span>
                <span className="stat-value text-success">{correctAnswers}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Words Improved</span>
                <span className="stat-value text-primary">{wordsImproved}</span>
              </div>
              {performance.time_spent && (
                <div className="stat-item">
                  <span className="stat-label">Time</span>
                  <span className="stat-value">{Math.round(performance.time_spent / 60)}m</span>
                </div>
              )}
            </div>
          </div>

          {/* Mastery Changes */}
          {renderMasteryChanges()}

          {/* Low Mastery Section for Regular Quiz */}
          {!isLowMasteryMode && lowMasteryCount > 0 && (
            <motion.div
              className="low-mastery-section"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <div className="low-mastery-header">
                <h3>🎯 Words Needing More Practice</h3>
                <p>{lowMasteryCount} words still need improvement (mastery ≤ 0)</p>
              </div>

              <div className="low-mastery-words-preview">
                {lowMasteryWords.slice(0, 3).map((word, index) => (
                  <div key={index} className="low-mastery-word-item">
                    <span className="word-text">{word.word}</span>
                    <span className={`mastery-level ${word.is_correct ? 'incorrect' : 'struggling'}`}>
                      {word.is_correct ? 'Incorrect' : 'Struggling'}
                    </span>
                  </div>
                ))}
                {lowMasteryCount > 3 && (
                  <div className="more-words">+{lowMasteryCount - 3} more</div>
                )}
              </div>

              <div className="action-buttons">
                <button 
                  onClick={handleStartLowMastery} 
                  className="btn btn-primary low-mastery-btn"
                  disabled={isLoadingLowMastery}
                >
                  {isLoadingLowMastery ? (
                    <>🔄 Loading...</>
                  ) : (
                    <>📚 Review Difficult Words ({lowMasteryCount})</>
                  )}
                </button>
                
                <button 
                  onClick={onContinue} 
                  className="btn btn-secondary"
                >
                  Skip for Now
                </button>
              </div>
            </motion.div>
          )}

          {/* Low Mastery Mode Completion */}
          {isLowMasteryMode && (
            <motion.div
              className="low-mastery-complete-section"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <h3>🔄 Low Mastery Review Complete</h3>
              
              {lowMasteryCount > 0 ? (
                <div className="continue-practice">
                  <p className="practice-message">
                    {lowMasteryCount} words still need more practice
                  </p>
                  <div className="remaining-words-preview">
                    {lowMasteryWords.slice(0, 4).map((word, index) => (
                      <span key={index} className="remaining-word-tag">
                        {word.word}
                      </span>
                    ))}
                    {lowMasteryCount > 4 && (
                      <span className="more-words-tag">+{lowMasteryCount - 4}</span>
                    )}
                  </div>
                  
                  <div className="action-buttons">
                    <button 
                      onClick={handleStartLowMastery} 
                      className="btn btn-primary"
                      disabled={isLoadingLowMastery}
                    >
                      {isLoadingLowMastery ? (
                        <>🔄 Loading...</>
                      ) : (
                        <>🔁 Continue Practice ({lowMasteryCount} words)</>
                      )}
                    </button>
                    
                    <button 
                      onClick={onContinue} 
                      className="btn btn-secondary"
                    >
                      Finish for Now
                    </button>
                  </div>
                </div>
              ) : (
                <div className="all-improved">
                  <div className="success-message">
                    <span className="success-emoji">🎉</span>
                    <h4>Excellent! All words improved</h4>
                    <p>Great progress on your vocabulary mastery!</p>
                  </div>
                  
                  <button 
                    onClick={onContinue} 
                    className="btn btn-primary"
                  >
                    🏠 Back to Dashboard
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Regular Mode Completion */}
          {!isLowMasteryMode && lowMasteryCount === 0 && (
            <div className="completion-section">
              <div className="completion-message">
                <h3>🎉 Great Work!</h3>
                <p>All words are progressing well. Ready for the next challenge?</p>
              </div>
              
              <button 
                onClick={onContinue} 
                className="btn btn-primary completion-btn"
              >
                Continue Learning
              </button>
            </div>
          )}

          {/* Session Details */}
          {sessionData && Object.keys(sessionData).length > 0 && (
            <div className="session-details">
              <h4>Session Details</h4>
              <div className="session-info">
                {sessionData.session_id && (
                  <p><strong>Session ID:</strong> {sessionData.session_id}</p>
                )}
                {sessionData.total_time && (
                  <p><strong>Total Time:</strong> {Math.round(sessionData.total_time / 1000)}s</p>
                )}
                {performance.retry_queue_cleared !== undefined && (
                  <p><strong>Retry Queue:</strong> {performance.retry_queue_cleared ? 'Cleared' : 'Pending'}</p>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Navigation */}
      <div className="read-mode-navigation">
        <div className="nav-hint left">
          <span>ESC</span>
          <small>Dashboard</small>
        </div>
        <div className="nav-hint center">
          <span>{isLowMasteryMode ? 'Low Mastery Report' : 'Quiz Report'}</span>
          <small>Review Complete</small>
        </div>
        <div className="nav-hint right">
          <span>ENTER</span>
          <small>Continue</small>
        </div>
      </div>
    </div>
  );
};

export default CycleReport;
