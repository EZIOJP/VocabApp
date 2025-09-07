// CycleQuizMode_Enhanced_Timing.jsx
// Completely redesigned quiz component with adjustable timing for wrong answers.
// Docstrings indicate where you can manipulate behavior and timing.

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from "../apiConfig";
import './ModernQuizMode.css'; // Ensure this CSS file is loaded

/**
 * CycleQuizMode component handles adaptive quiz flow.
 *
 * Props:
 * - words: Array of word objects (must include id, word, pronunciation, options).
 * - groupNumber: Number indicating current vocabulary group.
 * - isLowMastery: Boolean for low-mastery quiz mode.
 * - onComplete: Callback when quiz completes.
 * - onBackToDashboard: Callback to return to dashboard.
 */
const CycleQuizMode = ({
  words,
  groupNumber,
  isLowMastery = false,
  onComplete,
  onBackToDashboard
}) => {
  const [quizSession, setQuizSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [allAttempts, setAllAttempts] = useState([]);
  const [resultData, setResultData] = useState(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(0);

  // Start the quiz session on mount
  useEffect(() => {
    startQuizSession();
  }, []);

  /**
   * startQuizSession()
   * Initializes quiz session via API.
   * Docstring: You can adjust group, quiz_type, or limit here.
   */
  const startQuizSession = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const wordIds = words.map(word => word.id);
      const response = await fetch(`${API_BASE_URL}/quiz/adaptive/start/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_type: isLowMastery ? 'low_mastery' : 'adaptive_group',
          group_number: groupNumber,
          word_ids: wordIds
        })
      });
      if (!response.ok) throw new Error('Failed to start quiz session');
      const data = await response.json();
      setQuizSession(data);
      setTotalQuestions(wordIds.length);
      loadNextQuestion(data.session_id);
    } catch (e) {
      console.error('Error starting quiz:', e);
      setError(e.message || 'Failed to start quiz');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * loadNextQuestion(sessionId)
   * Loads next question from API.
   * Docstring: You can throttle API calls or prefetch next questions here.
   */
  const loadNextQuestion = async (sessionId) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/quiz/adaptive/${sessionId}/question/`);
      if (!response.ok) throw new Error('Failed to load question');
      const data = await response.json();
      if (data.session_complete) {
        await completeQuiz(sessionId);
        return;
      }
      setCurrentQuestion(data);
      setSelectedAnswer('');
      setShowResult(false);
      setResultData(null);
      setStartTime(Date.now());
    } catch (e) {
      console.error('Error loading question:', e);
      setError(e.message || 'Failed to load question');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * submitAnswer(answer, isDirectSubmit)
   * Submits user's answer and shows result.
   *
   * Docstring: To adjust timing for correct vs wrong answers,
   * change delayTime values below (in milliseconds).
   */
  const submitAnswer = async (answer = selectedAnswer, isDirectSubmit = false) => {
    if (!answer || !currentQuestion || !quizSession || showResult) return;
    try {
      setIsLoading(true);
      const timeTaken = startTime ? Date.now() - startTime : 0;
      const response = await fetch(`${API_BASE_URL}/quiz/adaptive/${quizSession.session_id}/answer/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word_id: currentQuestion.word_id,
          answer: answer,
          time_taken: timeTaken
        })
      });
      if (!response.ok) throw new Error('Failed to submit answer');
      const result = await response.json();
      const attemptData = {
        word: currentQuestion.word,
        word_id: currentQuestion.word_id,
        user_answer: answer,
        correct_answer: result.correct_answer,
        is_correct: result.is_correct,
        mastery_before: result.mastery_before,
        mastery_after: result.mastery_after,
        time_taken: timeTaken
      };
      setAllAttempts(prev => [...prev, attemptData]);
      setResultData(result);
      setSelectedAnswer(answer);
      setShowResult(true);
      setCurrentQuestionNumber(prev => prev + 1);

      // Docstring: Adjust delays here
      const delayTime = result.is_correct
        ? 1200   // correct answer display duration
        : 3000; // wrong answer display duration

      setTimeout(() => {
        if (quizSession?.session_id) {
          loadNextQuestion(quizSession.session_id);
        }
      }, delayTime);

    } catch (e) {
      console.error('Error submitting answer:', e);
      setError(e.message || 'Failed to submit answer');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * handleDirectSubmit(answer)
   * Immediately submits on direct button click.
   * Docstring: You can add confirmation delay here if needed.
   */
  const handleDirectSubmit = (answer) => {
    setSelectedAnswer(answer);
    submitAnswer(answer, true);
  };

  /**
   * handleAnswerSelect(answer)
   * Sets selected answer for traditional submit.
   * Docstring: You can implement toggling or deselect here.
   */
  const handleAnswerSelect = (answer) => {
    if (showResult) return;
    setSelectedAnswer(answer);
  };

  /**
   * completeQuiz(sessionId)
   * Completes quiz session and calls parent callback.
   * Docstring: You can modify final data processing here.
   */
  const completeQuiz = async (sessionId) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/quiz/adaptive/${sessionId}/complete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to complete quiz');
      const completionData = await response.json();
      await markWordsAsRead();
      onComplete({
        ...completionData,
        attempts: allAttempts,
        sessionData: quizSession
      });
    } catch (e) {
      console.error('Error completing quiz:', e);
      setError(e.message || 'Failed to complete quiz');
    } finally {
      setIsLoading(false);
    }
  };

  // Marks all words as read (you can batch or debounce this)
  const markWordsAsRead = async () => {
    for (const word of words) {
      try {
        await fetch(`${API_BASE_URL}/words/mark-read/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word_id: word.id })
        });
      } catch (err) {
        console.warn(`Failed to mark word ${word.id} read:`, err);
      }
    }
  };

  /**
   * Keyboard shortcuts handler.
   * Docstring: Add more keys or prevent default as needed.
   */
  const handleKeyPress = useCallback((e) => {
    if (showResult || !currentQuestion) return;
    const key = e.key.toLowerCase();
    if (key >= '1' && key <= '4') {
      const idx = parseInt(key) - 1;
      if (currentQuestion.options?.[idx]) {
        handleDirectSubmit(currentQuestion.options[idx]);
      }
    } else if (key === 'enter' && selectedAnswer) {
      submitAnswer();
    } else if (key === 'escape') {
      onBackToDashboard();
    }
  }, [currentQuestion, selectedAnswer, showResult]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  if (error) {
    return (
      <div className="modern-quiz-container">
        <div className="quiz-error">
          <h2>Quiz Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && !currentQuestion) {
    return (
      <div className="modern-quiz-container">
        <div className="quiz-loading">
          <div className="loading-spinner" />
          <h2>Starting Quiz...</h2>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="modern-quiz-container">
        <div className="quiz-loading">
          <div className="loading-spinner" />
          <h2>Loading Question...</h2>
        </div>
      </div>
    );
  }

  const progressPercentage =
    Math.round((currentQuestionNumber / Math.max(totalQuestions, currentQuestionNumber)) * 100);

  return (
    <div className="modern-quiz-container">
      {/* Header */}
      <header className="quiz-header">
        <div className="header-content">
          <div className="quiz-brand">
            <div className="brand-icon">🧠</div>
            <h1>VocabMaster</h1>
          </div>
          <nav className="quiz-nav">
            <button onClick={onBackToDashboard} className="nav-btn">
              Dashboard
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="quiz-main">
        <div className="quiz-card-container">
          <motion.div
            className={`quiz-card ${
              showResult
                ? resultData?.is_correct
                  ? 'correct-state'
                  : 'incorrect-state'
                : ''
            }`}
            animate={{
              backgroundColor: showResult
                ? resultData?.is_correct
                  ? 'var(--success-color)'
                  : 'var(--error-color)'
                : 'white',
              scale: showResult ? 1.01 : 1
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Progress Section */}
            <div className="quiz-progress">
              <div className="progress-info">
                <span className="progress-text">Progress</span>
                <span className="progress-percentage">{progressPercentage}%</span>
              </div>
              <div className="progress-bar">
                <motion.div
                  className="progress-fill"
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Question vs Result */}
            <AnimatePresence mode="wait">
              {!showResult ? (
                <motion.div
                  key="question"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Question Number */}
                  <div className="question-meta">
                    <p className="question-number">
                      Question {currentQuestionNumber} of{' '}
                      {Math.max(totalQuestions, currentQuestionNumber)}
                    </p>
                  </div>

                  {/* Question Text */}
                  <div className="question-content">
                    <h2 className="question-text">
                      {currentQuestion.question_text ||
                        `What does "${currentQuestion.word}" mean?`}
                    </h2>
                    {currentQuestion.word && currentQuestion.pronunciation && (
                      <div className="word-info">
                        <span className="word-title">{currentQuestion.word}</span>
                        <span className="word-pronunciation">
                          /{currentQuestion.pronunciation}/
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Options */}
                  <div className="options-container">
                    {currentQuestion.options?.map((option, idx) => (
                      <div key={idx} className="option-row">
                        <button
                          onClick={() => handleAnswerSelect(option)}
                          className={`quiz-option ${
                            selectedAnswer === option ? 'selected' : ''
                          }`}
                          disabled={isLoading}
                        >
                          <span className="option-letter">
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          <span className="option-text">{option}</span>
                        </button>
                        <button
                          onClick={() => handleDirectSubmit(option)}
                          className={`direct-submit ${
                            selectedAnswer === option ? 'highlighted' : ''
                          }`}
                          disabled={isLoading}
                          title="Submit this answer"
                        >
                          ✓
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Submit Button */}
                  {selectedAnswer && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="submit-section"
                    >
                      <button
                        onClick={() => submitAnswer()}
                        disabled={isLoading}
                        className="submit-btn"
                      >
                        {isLoading ? 'Submitting...' : 'Submit Answer'}
                      </button>  
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="result-content"
                >
                  {/* Result Header */}
                  <div className="result-header">
                    <div className="result-icon">
                      {resultData?.is_correct ? '✅' : '❌'}
                    </div>
                    <h3 className="result-title">
                      {resultData?.is_correct ? 'Correct!' : 'Incorrect'}
                    </h3>
                  </div>

                  {/* Correct Answer Display */}
                  {!resultData?.is_correct && (
                    <div className="correct-answer-section">
                      <p className="correct-answer-label">Correct Answer:</p>
                      <p className="correct-answer-text">
                        {resultData?.correct_answer}
                      </p>
                    </div>
                  )}

                  {/* Mastery Change */}
                  {resultData?.mastery_before !== undefined &&
                    resultData?.mastery_after !== undefined && (
                      <div className="mastery-change">
                        <span className="mastery-label">Mastery Level</span>
                        <div className="mastery-progression">
                          <span className="mastery-before">
                            {resultData.mastery_before}
                          </span>
                          <span className="mastery-arrow">→</span>
                          <span className="mastery-after">
                            {resultData.mastery_after}
                          </span>
                        </div>
                      </div>
                    )}

                  {/* Loading Next Indicator */}
                  <div className="next-indicator">
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="loading-next"
                    >
                      Loading next question...
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="quiz-footer">
        <div className="footer-content">
          <div className="footer-hint left">
            <span>ESC</span>
            <small>Dashboard</small>
          </div>
          <div className="footer-hint center">
            <span>{isLowMastery ? 'Review Mode' : 'Quiz Mode'}</span>
            <small>1-4: Quick Select</small>
          </div>
          <div className="footer-hint right">
            <span>ENTER</span>
            <small>Submit</small>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CycleQuizMode;
