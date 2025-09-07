// src/components/WordDetails.jsx
import React from 'react';

export default function WordDetails({ word }) {
  return (
    <div className="p-4 space-y-4 bg-white rounded-lg shadow-md border border-gray-300 max-w-3xl mx-auto">
      
      {/* Meaning */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600">Meaning</h3>
        <p className="mt-1 text-base text-gray-900">{word.meaning || 'N/A'}</p>
      </div>

      {/* Word Breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600">Word Breakdown</h3>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2">
          <div><strong>Prefix:</strong> {word.word_breakdown?.prefix || 'N/A'}</div>
          <div><strong>Root:</strong> {word.word_breakdown?.root || 'N/A'}</div>
          <div><strong>Suffix:</strong> {word.word_breakdown?.suffix || 'N/A'}</div>
        </div>
      </div>

      {/* Etymology */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600">Etymology</h3>
        <p className="mt-1 text-base text-gray-900">{word.etymology || 'N/A'}</p>
      </div>

      {/* Mnemonic Story */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600">Story Mnemonic</h3>
        <p className="mt-1 text-base text-gray-900">{word.story_mnemonic || 'N/A'}</p>
      </div>

      {/* Examples */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600">Examples</h3>
        {Array.isArray(word.examples) && word.examples.length > 0 ? (
          <ul className="mt-2 list-disc list-inside space-y-1">
            {word.examples.map((ex, i) => (
              <li key={i} className="text-gray-900">
                <span className="capitalize font-semibold">{ex.style || 'default'}:</span>{" "}
                {ex.text}
                {ex.tags && ex.tags.length > 0 && (
                  <span className="ml-2 text-xs text-gray-500">({ex.tags.join(', ')})</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No examples available.</p>
        )}
      </div>

      {/* Additional info like synonyms, tags, external links */}
      {/* ... similar structure, add as needed */}
    </div>
  );
}
