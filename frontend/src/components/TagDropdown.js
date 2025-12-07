import React from 'react';
import { AVAILABLE_TAGS } from '../config/constants';

const TagDropdown = ({ selectedTag, onTagSelect }) => {
  return (
    <div className="mb-3">
      <select
        value={selectedTag}
        onChange={(e) => onTagSelect(e.target.value)}
        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-orange-500 focus:outline-none text-sm"
      >
        {AVAILABLE_TAGS.map(tag => (
          <option key={tag} value={tag}>{tag}</option>
        ))}
      </select>
    </div>
  );
};

export default TagDropdown;