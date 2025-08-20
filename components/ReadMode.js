import { useEffect, useState } from "react";

/**
 * ReadMode displays a vocabulary word with all its details in a responsive, visually clear card.
 * Sections: Word (capitalized), Pronunciation, Connotation, Meaning, Word Breakdown, Etymology, Story Mnemonic, Examples, Synonyms, Antonyms, Groups, Tags, Mastery, Source, External Links.
 * The main card is wide and adapts to screen size. The four main info boxes (Meaning, Word Breakdown, Etymology, Story Mnemonic) are always aligned and use pleasant, non-overwhelming colors.
 */
export default function ReadMode() {
  const [words, setWords] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch("http://192.168.0.106:8000/api/words/")
      .then((res) => res.json())
      .then((data) => setWords(data))
      .catch((err) => console.error(err));

    // Keyboard navigation for left/right arrow keys
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        setIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "ArrowRight") {
        setIndex((prev) => Math.min(prev + 1, words.length - 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [words.length]);

  if (words.length === 0) return <div>Loading words...</div>;

  const total = words.length;
  const word = words[index];

  const jumpTo = (e) => {
    const id = parseInt(e.target.value) - 1;
    if (!isNaN(id) && id >= 0 && id < total) setIndex(id);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-8 w-full max-w-6xl mx-auto mt-8 relative text-left space-y-6 border border-slate-200 flex flex-col gap-6 min-h-[60vh] transition-all duration-200">
      {/* Word ID badge */}
      <div className="absolute top-4 right-4 rounded-full bg-blue-100 text-blue-800 font-semibold text-xs px-4 py-1 shadow-sm border border-blue-200">
        ID: {word.id}
      </div>

      {/* Word, Pronunciation, Connotation */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-wrap">
        <span className="text-2xl sm:text-3xl font-semibold text-blue-700 tracking-tight leading-tight">
          {word.word
            ? word.word.charAt(0).toUpperCase() + word.word.slice(1)
            : ""}
        </span>
        {word.pronunciation && (
          <span className="text-lg sm:text-xl font-mono text-gray-500 leading-tight">
            ({word.pronunciation})
          </span>
        )}
        {word.connotation && (
          <span
            className={`px-3 py-1 rounded-full text-base sm:text-lg font-bold flex items-center ${
              word.connotation === "positive"
                ? "bg-green-100 text-green-700"
                : word.connotation === "negative"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {word.connotation}
          </span>
        )}
      </div>

      {/* Meaning, Word Breakdown, Etymology, Story Mnemonic - 2 per row on large, 1 per row on small screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        {/* Meaning */}
        <div className="bg-slate-50 rounded px-6 py-4 flex flex-col items-start border border-slate-200">
          <div className="text-xs text-slate-600 font-semibold mb-2 tracking-wide">
            Meaning
          </div>
          <div className="text-slate-900 text-base font-semibold mt-1">
            {word.meaning}
          </div>
        </div>
        {/* Word Breakdown (no heading) */}
        <div className="bg-slate-50 rounded px-6 py-4 flex flex-col items-start border border-slate-200 min-w-[180px]">
          <div className="flex flex-col gap-3 w-full">
            {(() => {
              const na = <span className="text-gray-400 text-base">N/A</span>;
              return (
                <>
                  <div className="flex flex-row items-center w-full mb-1 whitespace-nowrap">
                    <span className="text-xs sm:text-sm text-slate-700 font-semibold mr-1">
                      Prefix:
                    </span>
                    <span className="font-semibold text-blue-700 text-base whitespace-nowrap">
                      {word.word_breakdown?.prefix || na}
                    </span>
                  </div>
                  <div className="flex flex-row items-center w-full mb-1 whitespace-nowrap">
                    <span className="text-xs sm:text-sm text-slate-700 font-semibold mr-1">
                      Root:
                    </span>
                    <span className="font-semibold text-blue-700 text-base whitespace-nowrap">
                      {word.word_breakdown?.root || na}
                    </span>
                  </div>
                  <div className="flex flex-row items-center w-full whitespace-nowrap">
                    <span className="text-xs sm:text-sm text-slate-700 font-semibold mr-1">
                      Suffix:
                    </span>
                    <span className="font-semibold text-blue-700 text-base whitespace-nowrap">
                      {word.word_breakdown?.suffix || na}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
        {/* Etymology */}
        <div className="bg-slate-50 rounded px-6 py-4 flex flex-col items-start border border-slate-200">
          <div className="text-xs text-slate-600 font-semibold mb-2 tracking-wide">
            Etymology
          </div>
          <div className="text-slate-900 text-base font-medium mt-1">
            {word.etymology || <span className="text-gray-400">N/A</span>}
          </div>
        </div>
        {/* Story Mnemonic */}
        <div className="bg-slate-50 rounded px-6 py-4 flex flex-col items-start border border-slate-200">
          <div className="text-xs text-slate-600 font-semibold mb-2 tracking-wide">
            Story Mnemonic
          </div>
          <div className="text-slate-900 text-base font-medium mt-1">
            {word.story_mnemonic || <span className="text-gray-400">N/A</span>}
          </div>
        </div>
      </div>

      {/* Examples */}
      <div className="bg-blue-50 rounded p-4">
        <div className="text-xs text-blue-900 font-semibold mb-2 uppercase tracking-wide">
          Examples
        </div>
        <ul className="list-disc list-inside pl-4">
          {word.examples?.length > 0 ? (
            word.examples.map((example, i) => (
              <li key={i} className="mb-1">
                <span className="capitalize font-semibold text-blue-700 text-base">
                  {example.style}:
                </span>{" "}
                <span className="text-blue-900 text-base">{example.text}</span>
                {example.tags && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({example.tags.join(", ")})
                  </span>
                )}
              </li>
            ))
          ) : (
            <li className="text-gray-400">No examples available.</li>
          )}
        </ul>
      </div>

      {/* Synonyms, Antonyms, Groups, Tags */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded p-4">
          <div className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wide">
            Synonyms
          </div>
          <div className="text-blue-700 text-sm font-medium">
            {word.synonyms?.length ? (
              word.synonyms.join(", ")
            ) : (
              <span className="text-gray-400">N/A</span>
            )}
          </div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wide">
            Antonyms
          </div>
          <div className="text-blue-700 text-sm font-medium">
            {word.antonyms?.length ? (
              word.antonyms.join(", ")
            ) : (
              <span className="text-gray-400">N/A</span>
            )}
          </div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wide">
            Word Groups
          </div>
          <div className="text-blue-700 text-sm font-medium">
            {word.word_grouping?.length ? (
              word.word_grouping.join(", ")
            ) : (
              <span className="text-gray-400">N/A</span>
            )}
          </div>
        </div>
        <div className="bg-white border rounded p-4">
          <div className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wide">
            Tags
          </div>
          <div className="text-blue-700 text-sm font-medium">
            {word.tags?.length ? (
              word.tags.join(", ")
            ) : (
              <span className="text-gray-400">N/A</span>
            )}
          </div>
        </div>
      </div>

      {/* Mastery & Source */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded p-4">
          <div className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wide">
            Mastery
          </div>
          <div className="text-blue-900 text-base font-medium">
            {word.user_data?.mastery ?? (
              <span className="text-gray-400">N/A</span>
            )}
          </div>
        </div>
        <div className="bg-gray-50 rounded p-4">
          <div className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wide">
            Source
          </div>
          <div className="text-blue-900 text-base font-medium">
            {word.source || <span className="text-gray-400">N/A</span>}
          </div>
        </div>
      </div>

      {/* External Links */}
      {word.external_links && (
        <div className="bg-white border rounded p-4">
          <div className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wide">
            External Links
          </div>
          <ul className="list-disc list-inside pl-4 text-blue-600">
            {Object.entries(word.external_links).map(([site, url], i) => (
              <li key={i}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {site.charAt(0).toUpperCase() + site.slice(1)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4 items-center">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            className="bg-blue-500 hover:bg-blue-600 transition text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
            disabled={index === 0}
            tabIndex={0}
            aria-label="Previous word"
          >
            ⬅ Prev
          </button>
          <button
            className="bg-blue-500 hover:bg-blue-600 transition text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={() => setIndex((prev) => Math.min(prev + 1, total - 1))}
            disabled={index === total - 1}
            tabIndex={0}
            aria-label="Next word"
          >
            Next ➡
          </button>
        </div>
        <input
          type="number"
          placeholder="Go to ID"
          min="1"
          max={total}
          onChange={jumpTo}
          className="border border-blue-300 px-3 py-2 rounded-lg w-28 focus:outline-none focus:ring-2 focus:ring-blue-200 ml-0 sm:ml-auto"
        />
      </div>
    </div>
  );
}
