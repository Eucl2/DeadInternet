import React from 'react';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'Writing', label: 'Writing' },
  { value: 'Drawing', label: 'Drawing' },
  { value: 'Photography', label: 'Photography' }
];

const CategoryTabs = ({ selectedCategory, onCategorySelect }) => {
  return (
    <div className="flex space-x-3 mb-8 overflow-x-auto pb-2">
      {CATEGORIES.map((category) => (
        <button
          key={category.value}
          onClick={() => onCategorySelect(category.value)}
          className={`px-6 py-2 rounded-full text-sm font-light whitespace-nowrap transition-all ${
            selectedCategory === category.value
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-black'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
          }`}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
};

export default CategoryTabs;