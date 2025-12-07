import React, { useState } from 'react';
import { API_BASE } from '../config/constants';

const ProgressViewer = ({ post, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrevious = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : post.progress_photos.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev < post.progress_photos.length - 1 ? prev + 1 : 0));
  };

  const currentPhoto = post.progress_photos[currentIndex];

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
            <h3 className="text-xl font-light text-orange-500">Creative Process</h3>
            <p className="text-sm text-gray-400">{post.title}</p>
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
            src={`${API_BASE}${currentPhoto.image_url}`}
            alt={`Progress ${currentIndex + 1}`}
            className="w-full max-h-[60vh] object-contain"
          />
          
          {/* Navigation Arrows */}
          {post.progress_photos.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">
              Stage {currentIndex + 1} of {post.progress_photos.length}
            </span>
            
            {/* Progress Dots */}
            <div className="flex space-x-2">
              {post.progress_photos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex ? 'bg-orange-500 w-6' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {currentPhoto.caption && (
            <p className="text-gray-300">{currentPhoto.caption}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressViewer;