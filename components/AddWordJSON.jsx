import React, { useState } from "react";
import axios from "axios";

const AddWordJSON = () => {
  const [jsonInput, setJsonInput] = useState("");
  const [parsedWords, setParsedWords] = useState([]);
  const [status, setStatus] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

 const handlePreview = () => {
  try {
    const data = JSON.parse(jsonInput);
    const wordsArray = Array.isArray(data) ? data : [data];
    setParsedWords(wordsArray);
    setPreviewMode(true);
    setStatus(null);
  } catch (err) {
    let message = "❌ Invalid JSON format";

    // Attempt to be more informative if possible
    if (err instanceof SyntaxError) {
      const match = err.message.match(/position (\d+)/);
      if (match) {
        const pos = parseInt(match[1], 10);
        const context = jsonInput.substring(pos - 20, pos + 20);
        message += ` at position ${pos}:\n...${context}...`;
      } else {
        message += `: ${err.message}`;
      }
    } else {
      message += `: ${err.message}`;
    }

    setStatus({ type: "error", message });
    setPreviewMode(false);
  }
};


  const handleSubmit = async () => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/add-words/", parsedWords);
      setStatus({
        type: "success",
        message: `✅ Added ${response.data.added_count} words. ❌ Failed: ${response.data.failed_count}`,
        details: response.data,
      });
      setJsonInput("");
      setParsedWords([]);
      setPreviewMode(false);
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message: "❌ Server error or invalid word data",
        details: error.response?.data || null,
      });
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">📥 Add Words via JSON</h2>

      <textarea
        className="w-full p-2 border rounded h-80 font-mono"
        placeholder='Paste JSON here. Accepts a single object or array of word objects.'
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
      ></textarea>

      <div className="mt-4 flex gap-2">
        <button
          onClick={handlePreview}
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        >
          Preview
        </button>
        {previewMode && (
          <button
            onClick={handleSubmit}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Confirm & Submit
          </button>
        )}
      </div>

      {previewMode && parsedWords.length > 0 && (
        <div className="mt-4 border rounded p-4 bg-gray-50">
          <h3 className="font-semibold mb-2">🧾 Preview:</h3>
          <ul className="list-disc ml-5 space-y-2">
            {parsedWords.map((word, index) => (
              <li key={index}>
                <div><strong>{word.word}</strong> — <em>{word.meaning || "No meaning"}</em></div>
                {word.pronunciation && <div className="text-sm">🔊 <strong>Pronunciation:</strong> {word.pronunciation}</div>}
                {word.connotation && <div className="text-sm">🌈 <strong>Connotation:</strong> {word.connotation}</div>}
                {word.examples?.length > 0 && (
                  <div className="text-sm text-gray-600">
                    ✍️ <strong>Example:</strong> {word.examples[0]?.example}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {status && (
        <div
          className={`mt-4 p-3 rounded ${
            status.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          <p>{status.message}</p>
          {status.details?.failed?.length > 0 && (
  <div className="mt-2">
    <strong>Failed Words:</strong>
    <ul className="list-disc ml-5 text-sm space-y-2">
      {status.details.failed.map((f, i) => (
        <li key={i}>
          <div>
            <code>{f.word || "(No word)"}</code> — {f.reason}
          </div>
          {f.details?.length > 0 && (
            <ul className="ml-5 list-disc">
              {f.details.map((d, j) => (
                <li key={j}>
                  <strong>{d.field}:</strong> <code>{JSON.stringify(d.value)}</code> —{" "}
                  {d.errors.join(", ")}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  </div>
)}

        </div>
      )}
    </div>
  );
};

export default AddWordJSON;
