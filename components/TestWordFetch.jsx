import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";
// Ensure the API URL is defined
const TestHeading = () => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold">🔻 Test</h2>
    </div>
  );
};

export default function TestWordFetch() {
  const [words, setWords] = useState([]);

  useEffect(() => {
  fetch(`${API_BASE_URL}/words/`)
      .then((res) => res.json())
      .then((data) => setWords(data))
      .catch((err) => console.error("Fetch error:", err));
  }, []);

  return (
    <div className="p-4">
      <TestHeading />
      <h2 className="text-xl font-bold mb-2">📦 Word API Test</h2>
      <pre className="text-sm overflow-auto max-h-96 bg-gray-100 p-2 rounded">
        {JSON.stringify(words, null, 2)}
      </pre>
    </div>
  );
}
