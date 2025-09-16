import React, { useState, useEffect } from 'react';

const Pulse = ({ user }) => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);

  // Mock posts for now
  useEffect(() => {
    setPosts([
      {
        id: 1,
        author: 'human_one',
        content: 'Just finished reading an incredible book about consciousness. The way our minds work is fascinating.',
        timestamp: '2 hours ago',
        tag: 'Thoughts'
      },
      {
        id: 2,
        author: 'creative_soul',
        content: 'Spent the morning painting by the lake. There\'s something about creating with your hands that no AI will ever replicate.',
        timestamp: '4 hours ago',
        tag: 'Creative'
      }
    ]);
  }, []);

  const handlePostSubmit = (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    setLoading(true);
    
    // Add new post (mock for now)
    const post = {
      id: Date.now(),
      author: user?.username || 'anonymous',
      content: newPost,
      timestamp: 'just now',
      tag: 'Thoughts'
    };
    
    setPosts([post, ...posts]);
    setNewPost('');
    setLoading(false);
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
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share your thoughts..."
            className="w-full bg-gray-800 border border-gray-700 rounded p-4 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none"
            rows="4"
            maxLength="500"
          />
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
        {posts.map((post) => (
          <div key={post.id} className="bg-gray-900 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full"></div>
                <span className="font-medium text-orange-500">@{post.author}</span>
                <span className="text-xs text-gray-500 uppercase tracking-wide px-2 py-1 bg-gray-800 rounded">
                  {post.tag}
                </span>
              </div>
              <span className="text-sm text-gray-500">{post.timestamp}</span>
            </div>
            <p className="text-gray-300 leading-relaxed">{post.content}</p>
          </div>
        ))}
      </div>

      <div className="text-center mt-12 text-gray-500">
        <p>End of human thoughts. Create something new above.</p>
      </div>
    </div>
  );
};

export default Pulse;