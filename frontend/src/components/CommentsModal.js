import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/constants';
import { formatTimestamp } from '../utils/timeUtils';

const CommentsModal = ({ isOpen, postId, onClose, user }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && postId) {
      loadComments();
    }
  }, [isOpen, postId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/posts/${postId}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const session_id = localStorage.getItem('session_id');
      const response = await axios.post(
        `${API_BASE}/posts/${postId}/comments`,
        { content: newComment },
        {
          params: { session_id }
        }
      );

      setComments([...comments, response.data]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to post comment:', error);
      alert('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Comments</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
            </svg>
          </button>
        </div>

        {/* Comment Form */}
        <form onSubmit={handleSubmitComment} className="p-6 border-b border-gray-700">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none"
            rows="3"
            maxLength={500}
          />
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-gray-500">{newComment.length}/500</span>
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-black font-medium rounded transition-colors disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="text-center text-gray-500 py-8">
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="bg-gray-800 rounded p-4 border border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium text-orange-500">@{comment.author}</span>
                  <span className="text-xs text-gray-500">{formatTimestamp(comment.created_at)}</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentsModal;