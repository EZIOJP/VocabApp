// LowMasteryPrompt.jsx - FINAL VERSION - Prompt to repeat low mastery words
import React from 'react';
import { motion } from 'framer-motion';
import './UniversalReadMode.css';

const LowMasteryPrompt = ({ lowMasteryWords, cycleCount, onDecision, onBackToDashboard }) => {
  const handleRepeat = () => {
    onDecision(true);
  };

  const handleSkip = () => {
    onDecision(false);
  };

  const maxCycles = 5;
  const isMaxCycles = cycleCount >= maxCycles;

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card p-8 text-center"
          >
            {/* Header */}
            <div className="text-6xl mb-4">
              {isMaxCycles ? '🔄' : '⚠️'}
            </div>
            <h2 className="text-3xl font-bold text-primary mb-2">
              {isMaxCycles ? 'Maximum Cycles Reached' : 'Low Mastery Words Detected'}
            </h2>
            
            {!isMaxCycles ? (
              <>
                <p className="text-secondary mb-6">
                  You have <strong>{lowMasteryWords.length} words</strong> with low mastery (≤ 0). 
                  Would you like to review these words again?
                </p>
                
                {/* Word List */}
                <div className="bg-secondary/20 rounded-lg p-4 mb-6">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {lowMasteryWords.slice(0, 10).map((wordData, index) => (
                      <span key={index} className="px-3 py-1 bg-error/20 text-error rounded-full text-sm">
                        {typeof wordData === 'object' ? wordData.word : wordData}
                      </span>
                    ))}
                    {lowMasteryWords.length > 10 && (
                      <span className="px-3 py-1 bg-error/20 text-error rounded-full text-sm">
                        +{lowMasteryWords.length - 10} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Cycle Count */}
                <div className="mb-6">
                  <div className="text-sm text-secondary mb-2">Review Cycles Completed</div>
                  <div className="flex justify-center gap-1">
                    {[...Array(maxCycles)].map((_, index) => (
                      <div 
                        key={index}
                        className={`w-3 h-3 rounded-full ${
                          index < cycleCount ? 'bg-warning' : 'bg-secondary'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="text-xs text-secondary mt-1">
                    {cycleCount} / {maxCycles} cycles
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 justify-center">
                  <button 
                    className="btn btn-primary px-6 py-3"
                    onClick={handleRepeat}
                  >
                    📚 Review Again
                  </button>
                  <button 
                    className="btn btn-secondary px-6 py-3"
                    onClick={handleSkip}
                  >
                    ⏭️ Skip for Now
                  </button>
                </div>

                <div className="mt-4 text-xs text-secondary">
                  Reviewing low mastery words helps improve long-term retention
                </div>
              </>
            ) : (
              <>
                <p className="text-secondary mb-6">
                  You've completed the maximum number of review cycles for this session. 
                  The remaining <strong>{lowMasteryWords.length} words</strong> will be available 
                  for review in future sessions.
                </p>
                
                <button 
                  className="btn btn-primary px-8 py-3"
                  onClick={handleSkip}
                >
                  Continue to Next Phase
                </button>
              </>
            )}

            {/* Back to Dashboard */}
            <div className="mt-6 pt-4 border-t border-border">
              <button 
                className="btn btn-outline text-sm"
                onClick={onBackToDashboard}
              >
                ← Back to Dashboard
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LowMasteryPrompt;