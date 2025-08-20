import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

// Define a simple Button component if not using a UI library
const Button = ({ onClick, children, className = "" }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${className}`}
  >
    {children}
  </button>
);

// Generate math drills based on selected number
const generateDrillsByNumber = (num) => {
  const drills = [];

  // Multiplication table
  for (let j = 1; j <= 12; j++) {
    drills.push({
      question: `${num} × ${j}`,
      answer: (num * j).toString(),
      type: "Multiplication"
    });
  }

  // Square
  drills.push({
    question: `${num}²`,
    answer: (num * num).toString(),
    type: "Square"
  });

  // Cube
  drills.push({
    question: `${num}³`,
    answer: (num ** 3).toString(),
    type: "Cube"
  });

  // Power table for this number
  for (let exp = 1; exp <= 16; exp++) {
    drills.push({
      question: `${num}^${exp}`,
      answer: Math.pow(num, exp).toString(),
      type: "Power"
    });
  }

  // Fraction 1/num
  if (num !== 0) {
    drills.push({
      question: `1/${num}`,
      answer: (1 / num).toFixed(4),
      type: "Fraction"
    });
  }

  // Prime check
  const isPrime = (n) => {
    if (n < 2) return false;
    for (let i = 2; i * i <= n; i++) {
      if (n % i === 0) return false;
    }
    return true;
  };

  drills.push({
    question: `Is ${num} a prime? (yes/no)`,
    answer: isPrime(num) ? "yes" : "no",
    type: "Prime"
  });

  // Percentage (x% of 100)
  drills.push({
    question: `${num}% of 100`,
    answer: num.toString(),
    type: "Percentage"
  });

  return drills;
};

export default function QuizModeMath() {
  const [number, setNumber] = useState(null);
  const [drills, setDrills] = useState([]);
  const [index, setIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const handleStart = () => {
    const selected = parseInt(number);
    if (!selected || selected < 1 || selected > 50) return;
    const generated = generateDrillsByNumber(selected);
    setDrills(generated);
    setIndex(0);
    setScore(0);
    setDone(false);
    setUserAnswer("");
    setShowAnswer(false);
  };

  const handleSubmit = () => {
    const current = drills[index];
    const correct =
      userAnswer.trim().toLowerCase() === current.answer.trim().toLowerCase();
    if (correct) setScore(score + 1);
    setShowAnswer(true);
  };

  const handleNext = () => {
    if (index + 1 >= drills.length) {
      setDone(true);
    } else {
      setIndex(index + 1);
      setUserAnswer("");
      setShowAnswer(false);
    }
  };

  if (!drills.length) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-4">Start Math Drill</h2>
        <label className="block mb-2">
          Select a number (1 to 50):
          <input
            type="number"
            min={1}
            max={50}
            value={number || ""}
            onChange={(e) => setNumber(e.target.value)}
            className="mt-1 p-2 border rounded w-full"
          />
        </label>
        <Button onClick={handleStart}>Start Drill</Button>
      </div>
    );
  }

  const current = drills[index];

  if (done) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold">Quiz Completed</h2>
        <p className="mt-4">
          Your score: {score} / {drills.length}
        </p>
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Restart
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 shadow-xl rounded-2xl bg-white">
      <h2 className="text-xl font-semibold mb-2">{current.type} Drill</h2>
      <p className="mb-2">
        Question {index + 1} / {drills.length}
      </p>
      <p className="text-2xl font-bold mb-4">{current.question}</p>
      <input
        className="border p-2 w-full rounded mb-2"
        value={userAnswer}
        onChange={(e) => setUserAnswer(e.target.value)}
        placeholder="Your answer"
      />
      {showAnswer && (
        <p className="mb-2 text-sm text-gray-600">
          Correct Answer: <span className="font-bold">{current.answer}</span>
        </p>
      )}
      <div className="flex gap-4">
        {!showAnswer ? (
          <Button onClick={handleSubmit}>Submit</Button>
        ) : (
          <Button onClick={handleNext}>Next</Button>
        )}
      </div>
    </div>
  );
}
