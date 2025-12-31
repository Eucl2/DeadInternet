import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { formatTimestamp } from '../utils/timeUtils';
import { API_BASE, COMMENT_LIMITS } from '../config/constants';
import { usePasteHandler } from '../hooks/usePasteHandler';
import { useTypingCapture } from '../hooks/useTypingCapture';

const CommentsModal = ({ isOpen, postId, onClose, user, isCreative = false }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { pasteMessage, handlePaste } = usePasteHandler(COMMENT_LIMITS.PASTE_MESSAGE_DURATION || 4000);
  const { handleFocus, handleKeyDown, getTypingDataForSubmission, resetTypingData } = useTypingCapture();

  const baseUrl = isCreative ? `${API_BASE}/creative` : `${API_BASE}/posts`;

  useEffect(() => {
    if (isOpen && postId) {
      loadComments();
      resetTypingData();
    }
  }, [isOpen, postId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('session_id');
      const response = await axios.get(`${baseUrl}/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments(response.data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentChange = (e) => {
    const text = e.target.value;
    if (text.length <= COMMENT_LIMITS.MAX_LENGTH) {
      setNewComment(text);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;

    // Validate minimum characters
    if (newComment.trim().length < COMMENT_LIMITS.MIN_CHARS) {
      setError(`Comment must be at least ${COMMENT_LIMITS.MIN_CHARS} characters`);
      setTimeout(() => setError(''), 5000);
      return;
    }
    
    if (newComment.length > COMMENT_LIMITS.MAX_LENGTH) {
      setError(`Comment must be ${COMMENT_LIMITS.MAX_LENGTH} characters or less`);
      setTimeout(() => setError(''), 5000);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('session_id');
      const typingData = getTypingDataForSubmission();

      console.log('Submitting comment with typing data:', {
        intervalCount: typingData.intervals.length,
        totalTime: typingData.totalTime,
        thinkingTime: typingData.thinkingTime,
        backspaceCount: typingData.backspaceCount,
        pauseCount: typingData.pauseCount
      });

      const response = await axios.post(
        `${baseUrl}/${postId}/comments`,
        { 
          content: newComment,
          typing_data: typingData
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setComments([response.data, ...comments]);
      setNewComment('');
      resetTypingData();
    } catch (error) {
      console.error('Failed to post comment:', error);
      if (error.response?.data?.detail) {
        setError(error.response.data.detail);
      } else {
        setError('Failed to post comment');
      }
      setTimeout(() => setError(''), 5000);
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
            onChange={handleCommentChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onPaste={handlePaste}
            placeholder="Write a comment..."
            className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none break-words whitespace-normal"
            rows="3"
            maxLength={COMMENT_LIMITS.MAX_LENGTH}
          />
          {pasteMessage && (
            <div className="text-orange-500 text-xs mt-2">{pasteMessage}</div>
          )}
          {error && (
            <div className="text-red-500 text-xs mt-2">{error}</div>
          )}
          <div className="flex justify-between items-center mt-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">{newComment.length}/{COMMENT_LIMITS.MAX_LENGTH}</span>
              <span className="text-xs text-gray-500">Minimum {COMMENT_LIMITS.MIN_CHARS} characters required</span>
            </div>
            <button
              type="submit"
              disabled={submitting || newComment.trim().length < COMMENT_LIMITS.MIN_CHARS || newComment.length > COMMENT_LIMITS.MAX_LENGTH}
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
                <p className="text-gray-300 text-sm leading-relaxed break-words whitespace-normal">{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentsModal;