import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE, POST_LIMITS } from '../config/constants';
import { formatTimestamp } from '../utils/timeUtils';
import TagDropdown from '../components/TagDropdown';

const Pulse = ({ user }) => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [pasteMessage, setPasteMessage] = useState('');
  const [selectedTag, setSelectedTag] = useState('Thoughts');

  const [typingData, setTypingData] = useState({
    startTime: null,
    firstCharTime: null,
    lastEventTime: null,
    backspaceCount: 0,
    pauseCount: 0,
    intervals: []
  });
  const typingDataRef = useRef(typingData);

  useEffect(() => {
    typingDataRef.current = typingData;
  }, [typingData]);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const session_id = localStorage.getItem('session_id');
      const response = await axios.get(`${API_BASE}/posts`, {
        params: { session_id }
      });
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
  };

  const resetTypingData = () => {
    setTypingData({
      startTime: null,
      firstCharTime: null,
      lastEventTime: null,
      backspaceCount: 0,
      pauseCount: 0,
      intervals: []
    });
  };

  const handleFocus = () => {
    const now = Date.now();
    setTypingData(prev => ({
      ...prev,
      startTime: prev.startTime || now
    }));
  };

  const handleKeyDown = (e) => {
    const now = Date.now();
    const currentData = typingDataRef.current;

    if (!currentData.startTime) {
      setTypingData(prev => ({
        ...prev,
        startTime: now,
        firstCharTime: now
      }));
      return;
    }

    if (!currentData.firstCharTime && e.key.length === 1) {
      setTypingData(prev => ({
        ...prev,
        firstCharTime: now
      }));
    }
    // Track pauses
    if (currentData.lastEventTime) {
      const interval = now - currentData.lastEventTime;
      
      if (interval > 500) {
        setTypingData(prev => ({
          ...prev,
          pauseCount: prev.pauseCount + 1
        }));
      }

      setTypingData(prev => ({
        ...prev,
        intervals: [...prev.intervals, interval]
      }));
    }

    if (e.key === 'Backspace') {
      setTypingData(prev => ({
        ...prev,
        backspaceCount: prev.backspaceCount + 1
      }));
    }

    setTypingData(prev => ({
      ...prev,
      lastEventTime: now
    }));
  };

  const handlePaste = (e) => {
    e.preventDefault();
    setPasteMessage('Please type your thoughts fresh!');
    setTimeout(() => setPasteMessage(''), POST_LIMITS.PASTE_MESSAGE_DURATION);
  };

  const handleInputChange = (e) => {
    setNewPost(e.target.value);
  };

  const calculateTypingMetrics = () => {
    const data = typingDataRef.current;
    const now = Date.now();

    if (!data.startTime || !data.firstCharTime) {
      return {
        totalTime: 0,
        thinkingTime: 0,
        averageSpeed: 0,
        backspaceCount: 0,
        pauseCount: 0,
        speedVariance: 0
      };
    }

    const totalTime = now - data.startTime;
    const thinkingTime = data.firstCharTime - data.startTime;
    const actualTypingTime = totalTime - thinkingTime;
    const charCount = newPost.length;
    const averageSpeed = actualTypingTime > 0 ? (charCount / actualTypingTime) * 1000 : 0;

    const intervals = data.intervals;
    let speedVariance = 0;
    
    if (intervals.length > 1) {
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => 
        sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
      speedVariance = Math.sqrt(variance);
    }

    return {
      totalTime,
      thinkingTime,
      averageSpeed,
      backspaceCount: data.backspaceCount,
      pauseCount: data.pauseCount,
      speedVariance
    };
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    setLoading(true);
    
    try {
      const session_id = localStorage.getItem('session_id');
      const typingMetrics = calculateTypingMetrics();
      
      console.log('Submitting with typing metrics:', typingMetrics);

      const response = await axios.post(`${API_BASE}/posts`, {
        content: newPost,
        tag: selectedTag,
        typing_data: typingMetrics,
        space: 'pulse'
      }, {
        params: { session_id }
      });

      setPosts([response.data, ...posts]);
      setNewPost('');
      resetTypingData();
    } catch (error) {
      console.error('Failed to create post:', error);
      if (error.response?.data?.detail) {
        setPasteMessage(error.response.data.detail);
        setTimeout(() => setPasteMessage(''), 5000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLikeToggle = async (postId, isLiked) => {
    const session_id = localStorage.getItem('session_id');
    
    try {
      const response = await axios({
        method: isLiked ? 'DELETE' : 'POST',
        url: `${API_BASE}/posts/${postId}/like`,
        params: { session_id }
      });

      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, like_count: response.data.like_count, user_has_liked: !isLiked }
          : post
      ));
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-extralight mb-4">
          <span className="text-orange-500">Pulse</span>
        </h1>
      </div>

      {/* Create Post */}
      <form onSubmit={handlePostSubmit} className="bg-gradient-to-r from-gray-900 to-gray-800 border-l-4 border-orange-500 rounded-lg p-8 mb-8">
        <div className="mb-4">
          <TagDropdown 
            selectedTag={selectedTag}
            onTagSelect={setSelectedTag}
          />
          <textarea
            value={newPost}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onPaste={handlePaste}
            placeholder="Share your thoughts..."
            className="w-full bg-gray-800 border border-gray-700 rounded p-4 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none"
            rows="4"
            maxLength={POST_LIMITS.MAX_LENGTH}
          />
          {pasteMessage && (
            <div className="text-orange-500 text-sm mt-2 flex items-center">
              {pasteMessage}
            </div>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{newPost.length}/{POST_LIMITS.MAX_LENGTH} characters</span>
          <button
            type="submit"
            disabled={loading || !newPost.trim()}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-black font-medium rounded hover:from-orange-400 hover:to-orange-500 transition-all disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>

      <div className="space-y-6">
        {posts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No posts yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-gray-900 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full"></div>
                  <span className="font-medium text-orange-500">@{post.author}</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wide px-2 py-1 bg-gray-800 rounded">
                    {post.tag}
                  </span>
                </div>
                <span className="text-sm text-gray-500">{formatTimestamp(post.created_at)}</span>
              </div>
              <p className="text-gray-300 leading-relaxed mb-4">{post.content}</p>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleLikeToggle(post.id, post.user_has_liked)}
                  className="transition-transform hover:scale-110"
                >
                  <svg 
                    className="w-5 h-5" 
                    fill={post.user_has_liked ? "#ef4444" : "transparent"}
                    stroke={post.user_has_liked ? "#ef4444" : "#1f2937"}
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
          ))
        )}
      </div>

      {posts.length > 0 && (
        <div className="text-center mt-12 text-gray-500">
          <p>End of human thoughts. Create something new above.</p>
        </div>
      )}
    </div>
  );
};

export default Pulse;