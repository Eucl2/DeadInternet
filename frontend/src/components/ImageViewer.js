import React from 'react';
import { API_BASE } from '../config/constants';

const ImageViewer = ({ imageUrl, title, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="max-w-4xl w-full bg-gray-900 rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div>
            <h3 className="text-xl font-light text-orange-500">Final Work</h3>
            <p className="text-sm text-gray-400">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Image */}
        <div className="relative bg-black">
          <img
            src={`${API_BASE}${imageUrl}`}
            alt={title}
            className="w-full max-h-[60vh] object-contain"
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
            {title}
        </div>
      </div>
    </div>
  );
};

export default ImageViewer;