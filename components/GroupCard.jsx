// src/components/GroupCard.jsx
import React from 'react';

export default function GroupCard({ group, onClick }) {
  return (
    <div
      className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition cursor-pointer"
      onClick={onClick}
    >
      <h3 className="text-lg font-semibold">Group {group.group_number}</h3>
      <p className="text-sm text-gray-500">
        {group.studied}/{group.total} Words Studied
      </p>
      <div className="mt-2">
        <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
          <div
            className="bg-blue-500 h-2"
            style={{
              width: `${Math.round((group.studied / group.total) * 100)}%`
            }}
          />
        </div>
      </div>
    </div>
  );
}
