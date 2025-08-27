import React, { useMemo, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

/** ---------- small helpers ---------- */
const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
const isNumber = (v) => typeof v === "number" && !Number.isNaN(v);

const looksLikeUrl = (v) =>
  typeof v === "string" &&
  /^https?:\/\/[^\s]+$/i.test(v.trim());

/** Basic client-side shape validation (not a full JSON Schema) */
function validateWord(entry) {
  const errors = [];

  // required strings
  if (!isNonEmptyString(entry.word)) errors.push("word: required string");
  if (!isNonEmptyString(entry.meaning)) errors.push("meaning: required string");
  if (!isNonEmptyString(entry.category)) errors.push("category: required string");

  // connotation optional but prefer a known value if present
  if (entry.connotation && !["positive", "neutral", "negative"].includes(entry.connotation))
    errors.push(`connotation: must be positive|neutral|negative`);

  // examples
  if (!Array.isArray(entry.examples) || entry.examples.length === 0) {
    errors.push("examples: must be a non-empty array");
  } else {
    // check first 3 if present
    entry.examples.slice(0, 3).forEach((ex, idx) => {
      if (!ex || typeof ex !== "object") {
        errors.push(`examples[${idx}]: must be object`);
        return;
      }
      if (!isNonEmptyString(ex.text)) errors.push(`examples[${idx}].text: required`);
      if (!Array.isArray(ex.tags)) errors.push(`examples[${idx}].tags: must be array`);
      if (ex.style && !["default", "pop-culture", "meme", "professional"].includes(ex.style)) {
        errors.push(`examples[${idx}].style: unexpected "${ex.style}"`);
      }
    });
  }

  // word_breakdown
  if (entry.word_breakdown && typeof entry.word_breakdown === "object") {
    const wb = entry.word_breakdown;
    ["prefix", "root", "suffix"].forEach((k) => {
      if (!(k in wb)) errors.push(`word_breakdown.${k}: missing`);
    });
  }

  // spaced_repetition
  if (!entry.spaced_repetition || typeof entry.spaced_repetition !== "object") {
    errors.push("spaced_repetition: required object");
  } else {
    const sr = entry.spaced_repetition;
    if (!("interval" in sr)) errors.push("spaced_repetition.interval: required (0 ok)");
    if (!("next_review" in sr)) errors.push("spaced_repetition.next_review: required (null ok)");
  }

  // zeros/numbers
  const numFields = ["mastery", "times_asked", "times_correct", "time_spent_quiz", "time_spent_read", "last_practiced"];
  numFields.forEach((k) => {
    if (!(k in entry)) errors.push(`${k}: required (0 ok)`);
    else if (!isNumber(entry[k])) errors.push(`${k}: must be number`);
  });

  // links (pattern check only; no network possible here)
  if (entry.external_links && typeof entry.external_links === "object") {
    const { dictionary, etymology, wiktionary } = entry.external_links;
    if (dictionary && !looksLikeUrl(dictionary)) errors.push("external_links.dictionary: invalid URL");
    if (etymology && !looksLikeUrl(etymology)) errors.push("external_links.etymology: invalid URL");
    if (wiktionary && !looksLikeUrl(wiktionary)) errors.push("external_links.wiktionary: invalid URL");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function uniqueByWord(arr) {
  const seen = new Set();
  const unique = [];
  const dups = [];
  for (const w of arr) {
    const k = (w.word || "").toLowerCase().trim();
    if (!k) continue;
    if (seen.has(k)) dups.push(w);
    else {
      seen.add(k);
      unique.push(w);
    }
  }
  return { unique, dups };
}

const truncate = (s, n = 100) =>
  typeof s === "string" && s.length > n ? s.slice(0, n) + "…" : s;

/** ---------- Component ---------- */
const AddWordJSON = () => {
  const [jsonInput, setJsonInput] = useState("");
  const [parsedWords, setParsedWords] = useState([]);
  const [status, setStatus] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [onlyValidToServer, setOnlyValidToServer] = useState(true);

  const handlePreview = () => {
    try {
      const data = JSON.parse(jsonInput);
      const wordsArray = Array.isArray(data) ? data : [data];
      setParsedWords(wordsArray);
      setPreviewMode(true);
      setStatus(null);
    } catch (err) {
      let message = "❌ Invalid JSON format";

      if (err instanceof SyntaxError) {
        const match = err.message.match(/position (\d+)/);
        if (match) {
          const pos = parseInt(match[1], 10);
          const context = jsonInput.substring(Math.max(0, pos - 30), pos + 30);
          message += ` at position ${pos}:\n…${context}…`;
        } else {
          message += `: ${err.message}`;
        }
      } else {
        message += `: ${String(err)}`;
      }

      setStatus({ type: "error", message });
      setPreviewMode(false);
      setParsedWords([]);
    }
  };

const handleSubmit = async () => {
  const payload = onlyValidToServer ? validRows : parsedWords;
  if (!payload.length) {
    setStatus({ type: "error", message: "❌ Nothing to submit (no valid rows?)" });
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/add-words/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // Try to read JSON either way (ok or not ok)
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      // attach structured data so the catch can read it
      err.responseData = data;
      throw err; // <-- proper Error object (fixes no-throw-literal)
    }

    setStatus({
      type: "success",
      message: `✅ Added ${data.added_count ?? payload.length} words. ❌ Failed: ${data.failed_count ?? 0}`,
      details: data,
    });
    setJsonInput("");
    setParsedWords([]);
    setPreviewMode(false);
  } catch (error) {
    setStatus({
      type: "error",
      message: "❌ Server error or invalid word data",
      details: error.responseData ?? null, // <-- use the attached payload if present
    });
  }
};


  // ----- derived: validation, duplicates, summary -----
  const validations = useMemo(
    () => parsedWords.map((w) => validateWord(w)),
    [parsedWords]
  );

  const validRows = useMemo(
    () => parsedWords.filter((_, i) => validations[i].valid),
    [parsedWords, validations]
  );

  const invalidRows = useMemo(
    () =>
      parsedWords
        .map((w, i) => ({ w, idx: i, errors: validations[i].errors }))
        .filter((x) => x.errors.length > 0),
    [parsedWords, validations]
  );

  const { unique, dups } = useMemo(() => uniqueByWord(parsedWords), [parsedWords]);
  const summary = useMemo(() => {
    return {
      totalParsed: parsedWords.length,
      uniqueCount: unique.length,
      duplicateCount: dups.length,
      validCount: validRows.length,
      invalidCount: invalidRows.length
    };
  }, [parsedWords, unique, dups, validRows, invalidRows]);

  const copyValidToClipboard = async () => {
    try {
      const text = JSON.stringify(validRows, null, 2);
      await navigator.clipboard.writeText(text);
      setStatus({ type: "success", message: "📋 Copied valid JSON to clipboard" });
    } catch {
      setStatus({ type: "error", message: "❌ Couldn’t copy to clipboard" });
    }
  };

  const downloadValid = () => {
    const blob = new Blob([JSON.stringify(validRows, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "valid_words.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    setJsonInput("");
    setParsedWords([]);
    setPreviewMode(false);
    setStatus(null);
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">📥 Add Words via JSON</h2>

      <textarea
        className="w-full p-2 border rounded h-64 font-mono"
        placeholder='Paste JSON here. Accepts a single object or an array of word objects.'
        value={jsonInput}
        onChange={(e) => setJsonInput(e.target.value)}
      />

      <div className="mt-3 flex flex-wrap gap-2 items-center">
        <button
          onClick={handlePreview}
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        >
          Preview
        </button>

        {previewMode && (
          <>
            <button
              onClick={handleSubmit}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Confirm & Submit
            </button>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyValidToServer}
                onChange={(e) => setOnlyValidToServer(e.target.checked)}
              />
              Send only valid rows
            </label>

            <button
              onClick={copyValidToClipboard}
              className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
            >
              Copy valid JSON
            </button>
            <button
              onClick={downloadValid}
              className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700"
            >
              Download valid (.json)
            </button>
            <button
              onClick={clearAll}
              className="bg-gray-200 text-gray-800 px-3 py-2 rounded hover:bg-gray-300"
            >
              Clear
            </button>
          </>
        )}
      </div>

      {/* Summary */}
      {previewMode && (
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="border rounded p-4 bg-gray-50">
            <h3 className="font-semibold mb-2">🧮 Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Parsed</div><div className="font-semibold">{summary.totalParsed}</div>
              <div>Unique</div><div className="font-semibold">{summary.uniqueCount}</div>
              <div>Duplicates</div><div className="font-semibold">{summary.duplicateCount}</div>
              <div>Valid</div><div className="font-semibold text-green-700">{summary.validCount}</div>
              <div>Invalid</div><div className="font-semibold text-red-700">{summary.invalidCount}</div>
            </div>
            {invalidRows.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer font-medium">Show invalid details</summary>
                <ul className="list-disc ml-5 mt-2 text-sm space-y-1">
                  {invalidRows.map(({ w, idx, errors }) => (
                    <li key={idx}>
                      <span className="font-semibold">{w.word || "(no word)"}:</span>{" "}
                      {errors.join("; ")}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          <div className="border rounded p-4 bg-gray-50">
            <h3 className="font-semibold mb-2">ℹ️ Tips</h3>
            <ul className="list-disc ml-5 text-sm space-y-1">
              <li>Examples must be an array; each example needs <code>text</code>, optional <code>tags</code>, and a <code>style</code>.</li>
              <li>Stats fields must be numbers (use 0): <code>mastery</code>, <code>times_asked</code>, <code>times_correct</code>, <code>time_spent_quiz</code>, <code>time_spent_read</code>, <code>last_practiced</code>.</li>
              <li>Links must look like URLs; the server will do any deeper checking.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Table preview */}
      {previewMode && parsedWords.length > 0 && (
        <div className="mt-4 border rounded">
          <div className="overflow-auto max-h-[60vh]">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-white shadow">
                <tr className="text-left border-b">
                  <th className="p-2">#</th>
                  <th className="p-2">Word</th>
                  <th className="p-2">Pron.</th>
                  <th className="p-2">Meaning</th>
                  <th className="p-2">Category</th>
                  <th className="p-2">Connotation</th>
                  <th className="p-2">Example (1st)</th>
                  <th className="p-2">SR</th>
                  <th className="p-2">Stats</th>
                  <th className="p-2">Links</th>
                  <th className="p-2">Valid?</th>
                </tr>
              </thead>
              <tbody>
                {parsedWords.map((w, i) => {
                  const v = validations[i];
                  const firstEx = Array.isArray(w.examples) && w.examples.length > 0 ? w.examples[0]?.text : "";
                  const sr = w.spaced_repetition || {};
                  const links = w.external_links || {};
                  const badLink =
                    (links.dictionary && !looksLikeUrl(links.dictionary)) ||
                    (links.etymology && !looksLikeUrl(links.etymology)) ||
                    (links.wiktionary && !looksLikeUrl(links.wiktionary));

                  return (
                    <tr key={i} className="border-b align-top">
                      <td className="p-2">{i + 1}</td>
                      <td className="p-2 font-semibold">{w.word || <span className="text-red-700">—</span>}</td>
                      <td className="p-2">{w.pronunciation || "—"}</td>
                      <td className="p-2">{truncate(w.meaning, 120) || "—"}</td>
                      <td className="p-2">{w.category || "—"}</td>
                      <td className="p-2">{w.connotation || "—"}</td>
                      <td className="p-2">{truncate(firstEx, 100) || "—"}</td>
                      <td className="p-2">
                        <div>int: <span className="font-mono">{sr.interval ?? "—"}</span></div>
                        <div>next: <span className="font-mono">{String(sr.next_review ?? "null")}</span></div>
                      </td>
                      <td className="p-2">
                        <div className="font-mono">m:{w.mastery ?? "—"} a:{w.times_asked ?? "—"} c:{w.times_correct ?? "—"}</div>
                        <div className="font-mono">q:{w.time_spent_quiz ?? "—"} r:{w.time_spent_read ?? "—"}</div>
                      </td>
                      <td className="p-2">
                        <div className={badLink ? "text-red-700" : ""}>
                          {links.dictionary ? <a className="underline" href={links.dictionary} target="_blank" rel="noreferrer">dict</a> : "—"}{" "}
                          {links.etymology ? <a className="underline" href={links.etymology} target="_blank" rel="noreferrer">ety</a> : "—"}{" "}
                          {links.wiktionary ? <a className="underline" href={links.wiktionary} target="_blank" rel="noreferrer">wiki</a> : "—"}
                        </div>
                      </td>
                      <td className="p-2">
                        {v.valid ? (
                          <span className="text-green-700 font-semibold">OK</span>
                        ) : (
                          <details>
                            <summary className="cursor-pointer text-red-700 font-semibold">Issues</summary>
                            <ul className="list-disc ml-5 text-xs mt-1">
                              {v.errors.map((e, j) => (
                                <li key={j}>{e}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-2 text-xs text-gray-500">
            Showing {parsedWords.length} rows. Scroll to view all.
          </div>
        </div>
      )}

      {/* Status Block */}
      {status && (
        <div
          className={`mt-4 p-3 rounded ${
            status.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          <p className="font-medium">{status.message}</p>

          {/* If your backend returns detailed per-word failures, render here */}
          {status.details?.failed?.length > 0 && (
            <div className="mt-2">
              <strong>Failed Words:</strong>
              <ul className="list-disc ml-5 text-sm space-y-2">
                {status.details.failed.map((f, i) => (
                  <li key={i}>
                    <div>
                      <code>{f.word || "(No word)"}</code> — {f.reason}
                    </div>
                    {Array.isArray(f.details) && f.details.length > 0 && (
                      <ul className="ml-5 list-disc">
                        {f.details.map((d, j) => (
                          <li key={j}>
                            <strong>{d.field}:</strong> <code>{JSON.stringify(d.value)}</code> — {d.errors.join(", ")}
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
