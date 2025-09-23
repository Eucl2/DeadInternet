import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const Pulse = ({ user }) => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [pasteMessage, setPasteMessage] = useState('');
  const [selectedTag, setSelectedTag] = useState('Thoughts');
  const availableTags = [
    'Thoughts', 
    'Feelings', 
    'Facts', 
    'Travel', 
    'Food', 
    'Work', 
    'Learning', 
    'Creative'
  ];

  // Load posts from database
  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const response = await axios.get(`${API_BASE}/posts`);
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
  };

  // Paste prevention handler
  const handlePaste = (e) => {
    e.preventDefault();
    setPasteMessage('Please type your thoughts fresh!');
    setTimeout(() => setPasteMessage(''), 4000);
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    setLoading(true);
    
    try {
      const session_id = localStorage.getItem('session_id');
      const response = await axios.post(`${API_BASE}/posts`, {
        content: newPost,
        tag: selectedTag
      }, {
        params: { session_id }
      });

      // Add new post to the beginning of posts array
      setPosts([response.data, ...posts]);
      setNewPost('');
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
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
          <div className="mb-3">
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:border-orange-500 focus:outline-none text-sm"
            >
              {availableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            onPaste={handlePaste}
            placeholder="Share your thoughts..."
            className="w-full bg-gray-800 border border-gray-700 rounded p-4 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none"
            rows="4"
            maxLength="500"
          />
          {/* On paste message */}
          {pasteMessage && (
            <div className="text-orange-500 text-sm mt-2 flex items-center">
              {pasteMessage}
            </div>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{newPost.length}/500 characters</span>
          <button
            type="submit"
            disabled={loading || !newPost.trim()}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-black font-medium rounded hover:from-orange-400 hover:to-orange-500 transition-all disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>

      {/* Posts Feed */}
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
              <p className="text-gray-300 leading-relaxed">{post.content}</p>
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