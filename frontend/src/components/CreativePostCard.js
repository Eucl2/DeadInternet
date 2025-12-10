import React, { useState } from 'react';
import { formatTimestamp } from '../utils/timeUtils';
import { API_BASE } from '../config/constants';
import ImageViewer from './ImageViewer';

const CreativePostCard = ({ post, user, onLikeToggle, onViewProgress, onDelete, onViewComments }) => {
  const [viewingImage, setViewingImage] = useState(false);

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
        <div className="p-6 bg-gray-800 aspect-video flex items-center overflow-hidden">
          <p className="text-gray-300 line-clamp-8 leading-relaxed">
            {post.content}
          </p>
        </div>
      ) : (
        <div className="relative overflow-hidden group">
          <img
            src={`${API_BASE}${post.final_image_url}`}
            alt={post.title}
            className="w-full aspect-video object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setViewingImage(true)}
          />
          
          {/* AI Confidence Badge */}
          {post.art_ai_confidence !== null && post.art_ai_confidence !== undefined && (
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="relative">
                <button
                  className="peer bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 hover:bg-gray-800 transition-colors"    
                >
                  {Math.round(100 - post.art_ai_confidence * 100)}%
                </button>
                
                {/* Tooltip on hover */}
                <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs text-gray-300 pointer-events-none opacity-0 peer-hover:opacity-100 transition-opacity z-10 whitespace-normal">
                  We are {100 - Math.round(post.art_ai_confidence * 100)}% sure this image is not AI generated
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Post Info */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs uppercase tracking-wide px-2 py-1 rounded ${getCategoryColor(post.category)} text-white`}>
            {post.category}
          </span>
          
          {/* Progress Dots */}
          {post.progress_photos.length > 0 && (
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
              <span className="text-xs text-gray-500 ml-2">Check Progress Photos</span>
            </button>
          )}
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
          <div className="flex items-center space-x-3">
            <span className="text-gray-500">{formatTimestamp(post.created_at)}</span>
            {user && post.author === user.username && (
              <button
                onClick={() => onDelete(post.id)}
                className="text-gray-500 hover:text-red-500 transition-colors"
                title="Delete post"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Like and Comments */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center space-x-2">
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
          <button
            onClick={() => onViewComments(post.id)}
            className="text-sm text-gray-400 hover:text-orange-500 transition-colors"
          >
            Comments ({post.comment_count})
          </button>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {viewingImage && (
        <ImageViewer
          imageUrl={post.final_image_url}
          title={post.title}
          onClose={() => setViewingImage(false)}
        />
      )}
    </div>
  );
};

export default CreativePostCard;