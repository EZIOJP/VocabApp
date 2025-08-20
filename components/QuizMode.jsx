import React, { useEffect, useState } from "react";
import axios from "axios";

const QuizMode = () => {
  const [words, setWords] = useState([]);
  const [quizQueue, setQuizQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [quizLength, setQuizLength] = useState(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    axios.get("http://192.168.0.106:8000/api/words/")
      .then((response) => {
        const shuffled = response.data.sort(() => 0.5 - Math.random());
        setWords(shuffled);
      })
      .catch((error) => {
        console.error("Error fetching words:", error);
      });
  }, []);

  const startQuiz = (length) => {
    const queue = words.slice(0, length || words.length);
    setQuizQueue(queue);
    setCurrentIndex(0);
    setScore(0);
    setCompleted(false);
    setQuizLength(length || queue.length);
    setSelectedOption(null);
    setShowResult(false);
    setQuizStarted(true);
  };

  const currentWord = quizQueue[currentIndex];

  const generateOptions = () => {
    if (!currentWord) return [];

    const otherMeanings = words
      .filter(w => w.id !== currentWord.id)
      .map(w => w.meaning);

    const distractors = otherMeanings
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    const options = [...distractors, currentWord.meaning];
    return options.sort(() => 0.5 - Math.random());
  };

  const [options, setOptions] = useState([]);
  useEffect(() => {
    if (currentWord) {
      setOptions(generateOptions());
    }
  }, [currentWord]);

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    setShowResult(true);

    if (option === currentWord.meaning) {
      setScore(prev => prev + 1);
      
    } else {
      setScore(prev => prev - 1);
    }
  };

  const nextQuestion = () => {
    if (selectedOption !== currentWord.meaning) {
      // Push word to end of queue if answered wrong
      setQuizQueue(prev => [...prev, currentWord]);
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= quizQueue.length) {
      setCompleted(true);
      setQuizStarted(false);
    } else {
      setCurrentIndex(nextIndex);
      setShowResult(false);
      setSelectedOption(null);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Quiz Mode</h1>

      {!quizStarted && !completed && (
        <div className="mb-4">
          <h2 className="font-semibold mb-2">Choose Quiz Length:</h2>
          <button
            onClick={() => startQuiz(10)}
            className="mr-2 px-4 py-2 bg-blue-500 text-white rounded"
          >
            10 Questions
          </button>
          <button
            onClick={() => startQuiz(null)}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Unlimited
          </button>
        </div>
      )}

      {quizStarted && currentWord && (
        <>
          <p className="mb-2 text-lg font-semibold">
            Q{currentIndex + 1} / {quizLength}:
            What is the meaning of <span className="italic">"{currentWord.word}"</span>?
          </p>

          <div className="grid grid-cols-1 gap-2 mb-4">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionClick(option)}
                className={`p-2 rounded border ${
                  showResult
                    ? option === currentWord.meaning
                      ? "bg-green-200 border-green-500"
                      : option === selectedOption
                      ? "bg-red-200 border-red-500"
                      : ""
                    : "hover:bg-gray-100"
                }`}
                disabled={showResult}
              >
                {option}
              </button>
            ))}
          </div>

          {showResult && (
            <div className="mb-4">
              <p className="font-semibold text-blue-600">
                Correct meaning: {currentWord.meaning}
              </p>
              <p className="text-gray-700 mt-2">
                {currentWord.examples?.[0]?.text || "No example available."}
              </p>
            </div>
          )}

          <button
            onClick={nextQuestion}
            className="mt-2 px-4 py-2 bg-purple-600 text-white rounded"
          >
            Next
          </button>

          <p className="mt-4 text-md font-semibold">Score: {score}</p>
        </>
      )}

      {completed && (
        <div className="mt-6 text-center">
          <h2 className="text-xl font-bold text-green-700 mb-2">🎉 Quiz Completed!</h2>
          <p className="text-lg">Final Score: {score}</p>
          <button
            onClick={() => startQuiz(quizLength)}
            className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded"
          >
            Retry Quiz
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizMode;
