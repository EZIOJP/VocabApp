// QuizModeForCycle.jsx - Quiz mode for cycle (WITH marking as read)
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from './ThemeContext';
import './UniversalReadMode.css';

const QuizModeForCycle = ({ 
  words, 
  groupNumber, 
  isLowMasteryMode = false,
  onComplete, 
  onBackToDashboard 
}) => {
  const [quizSession, setQuizSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [questionResults, setQuestionResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startTime, setStartTime] = useState(null);

  // Start quiz session
  useEffect(() => {
    startQuizSession();
  }, []);

  const startQuizSession = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const wordIds = words.map(word => word.id);
      
      const response = await fetch('/api/quiz/adaptive/start/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_type: isLowMasteryMode ? 'low_mastery' : 'adaptive_group',
          group_number: groupNumber,
          word_ids: wordIds
        })
      });
      
      if (!response.ok) throw new Error('Failed to start quiz session');
      
      const data = await response.json();
      setQuizSession(data);
      
      // Load first question
      loadNextQuestion(data.session_id);
    } catch (e) {
      console.error('Error starting quiz:', e);
      setError(e.message || 'Failed to start quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const loadNextQuestion = async (sessionId) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/quiz/adaptive/${sessionId}/question/`);
      
      if (!response.ok) throw new Error('Failed to load question');
      
      const data = await response.json();
      
      if (data.session_complete) {
        await completeQuiz(sessionId);
        return;
      }
      
      setCurrentQuestion(data);
      setSelectedAnswer('');
      setShowResult(false);
      setStartTime(Date.now());
    } catch (e) {
      console.error('Error loading question:', e);
      setError(e.message || 'Failed to load question');
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!selectedAnswer || !currentQuestion || !quizSession) return;
    
    try {
      setIsLoading(true);
      
      const timeTaken = startTime ? Date.now() - startTime : 0;
      
      const response = await fetch(`/api/quiz/adaptive/${quizSession.session_id}/answer/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word_id: currentQuestion.word_id,
          answer: selectedAnswer,
          time_taken: timeTaken
        })
      });
      
      if (!response.ok) throw new Error('Failed to submit answer');
      
      const result = await response.json();
      
      setQuestionResults(prev => [...prev, {
        ...result,
        word: currentQuestion.word,
        question: currentQuestion,
        selectedAnswer,
        timeTaken
      }]);
      
      setShowResult(true);
      
      // Auto-advance after 2 seconds
      setTimeout(() => {
        loadNextQuestion(quizSession.session_id);
      }, 2000);
      
    } catch (e) {
      console.error('Error submitting answer:', e);
      setError(e.message || 'Failed to submit answer');
    } finally {
      setIsLoading(false);
    }
  };

  const completeQuiz = async (sessionId) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/quiz/adaptive/${sessionId}/complete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Failed to complete quiz');
      
      const completionData = await response.json();
      
      onComplete({
        ...completionData,
        attempts: questionResults,
        sessionData: quizSession
      });
      
    } catch (e) {
      console.error('Error completing quiz:', e);
      setError(e.message || 'Failed to complete quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (answer) => {
    if (showResult) return;
    setSelectedAnswer(answer);
  };

  const handleKeyPress = useCallback((e) => {
    if (showResult || !currentQuestion) return;
    
    const key = e.key.toLowerCase();
    if (key >= '1' && key <= '4') {
      const index = parseInt(key) - 1;
      if (currentQuestion.options && currentQuestion.options[index]) {
        setSelectedAnswer(currentQuestion.options[index]);
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
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-primary mb-2">Quiz Error</h2>
          <p className="text-secondary mb-4">{error}</p>
          <button className="btn btn-primary" onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isLoading && !currentQuestion) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner">🧠</div>
          <p className="text-primary mt-4">Preparing quiz...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner">📝</div>
          <p className="text-primary mt-4">Loading question...</p>
        </div>
      </div>
    );
  }

  const progress = quizSession ? 
    ((quizSession.total_questions || questionResults.length) + 1) / (words.length || 30) * 100 : 0;

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <div className="bg-surface/95 backdrop-blur-sm border-b border-card">
        <div className="flex justify-between items-center p-4">
          <div className="flex items-center gap-4">
            <button 
              className="btn btn-secondary"
              onClick={onBackToDashboard}
            >
              ← Dashboard
            </button>
            <h1 className="text-lg font-semibold text-primary">
              {isLowMasteryMode ? 'Low Mastery Quiz' : `Group ${groupNumber} - Quiz`}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-secondary">
              Question {(questionResults.length + 1)} / {words.length}
            </span>
            <div className="w-32 bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {!showResult ? (
              <motion.div
                key="question"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Question */}
                <div className="card p-8 text-center">
                  <h2 className="text-2xl font-semibold text-primary mb-2">
                    What does this word mean?
                  </h2>
                  <div className="text-5xl font-bold text-primary mb-4">
                    {currentQuestion.word}
                  </div>
                  {currentQuestion.pronunciation && (
                    <p className="text-lg text-secondary mb-6">
                      /{currentQuestion.pronunciation}/
                    </p>
                  )}
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {currentQuestion.options?.map((option, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                        selectedAnswer === option
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-surface text-primary hover:border-primary/50'
                      }`}
                      onClick={() => handleAnswerSelect(option)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </div>
                        <span className="font-medium">{option}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Submit Button */}
                <div className="text-center">
                  <button
                    className="btn btn-primary px-8 py-3 disabled:opacity-50"
                    onClick={submitAnswer}
                    disabled={!selectedAnswer || isLoading}
                  >
                    {isLoading ? 'Submitting...' : 'Submit Answer'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center"
              >
                <div className="card p-8">
                  <div className="text-6xl mb-4">
                    {questionResults[questionResults.length - 1]?.is_correct ? '✅' : '❌'}
                  </div>
                  <h3 className="text-2xl font-semibold text-primary mb-2">
                    {questionResults[questionResults.length - 1]?.is_correct ? 'Correct!' : 'Incorrect'}
                  </h3>
                  <p className="text-secondary mb-4">
                    The correct answer is: <strong>{questionResults[questionResults.length - 1]?.correct_answer}</strong>
                  </p>
                  
                  {/* Mastery Change */}
                  {questionResults[questionResults.length - 1] && (
                    <div className="text-sm text-secondary">
                      Mastery: {questionResults[questionResults.length - 1].mastery_before} → {questionResults[questionResults.length - 1].mastery_after}
                    </div>
                  )}
                  
                  <div className="mt-6 text-secondary">
                    Loading next question...
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="fixed bottom-4 left-4 text-xs text-secondary">
        <div>1-4: Select option</div>
        <div>Enter: Submit</div>
        <div>ESC: Exit</div>
      </div>
    </div>
  );
};

export default QuizModeForCycle;