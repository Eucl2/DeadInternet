import React from 'react';
import { formatTimestamp } from '../utils/timeUtils';
import { API_BASE } from '../config/constants';

const CreativePostCard = ({ post, onLikeToggle, onViewProgress }) => {
  const getCategoryColor = (category) => {
    const colors = {
      'Writing': 'bg-blue-500',
      'Drawing': 'bg-purple-500',
      'Photography': 'bg-green-500'
    };
    return colors[category] || 'bg-gray-500';
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-colors">
      {/* Image or Content Preview */}
      {post.category === 'Writing' ? (
        <div className="p-6 bg-gray-800 min-h-[200px] flex items-center">
          <p className="text-gray-300 line-clamp-6 leading-relaxed">
            {post.content}
          </p>
        </div>
      ) : (
        <img
          src={`${API_BASE}${post.final_image_url}`}
          alt={post.title}
          className="w-full aspect-video object-cover"
        />
      )}

      {/* Post Info */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs uppercase tracking-wide px-2 py-1 rounded ${getCategoryColor(post.category)} text-white`}>
            {post.category}
          </span>
          
          {/* Progress Dots */}
          <button
            onClick={() => onViewProgress(post)}
            className="flex items-center space-x-1 hover:opacity-70 transition-opacity"
          >
            {post.progress_photos.map((_, index) => (
              <div
                key={index}
                className="w-2 h-2 rounded-full bg-orange-500"
              />
            ))}
            <span className="text-xs text-gray-500 ml-2">Process</span>
          </button>
        </div>

        <h3 className="text-xl font-light text-white mb-2">{post.title}</h3>
        
        {post.description && (
          <p className="text-sm text-gray-400 mb-3 line-clamp-2">{post.description}</p>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full"></div>
            <span className="text-orange-500">@{post.author}</span>
          </div>
          <span className="text-gray-500">{formatTimestamp(post.created_at)}</span>
        </div>

        {/* Like Button */}
        <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-800">
          <button
            onClick={() => onLikeToggle(post.id, post.user_has_liked)}
            className="transition-transform hover:scale-110"
          >
            <svg 
              className="w-5 h-5" 
              fill={post.user_has_liked ? "#ef4444" : "transparent"}
              stroke={post.user_has_liked ? "#ef4444" : "#4b5563"}
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
              />
            </svg>
          </button>
          <span className="text-sm text-gray-400">{post.like_count || 0}</span>
        </div>
      </div>
    </div>
  );
};

export default CreativePostCard;