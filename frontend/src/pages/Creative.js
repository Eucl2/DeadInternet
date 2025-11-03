import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/constants';
import { Link } from 'react-router-dom';
import CreativePostCard from '../components/CreativePostCard';
import CategoryTabs from '../components/CategoryTabs';
import ProgressViewer from '../components/ProgressViewer';

const Creative = ({ user }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewingProgress, setViewingProgress] = useState(null);

  useEffect(() => {
    loadPosts();
  }, [selectedCategory]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const session_id = localStorage.getItem('session_id');
      const params = { session_id };
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      
      const response = await axios.get(`${API_BASE}/creative`, { params });
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to load creative posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLikeToggle = async (postId, isLiked) => {
    const session_id = localStorage.getItem('session_id');
    
    try {
      const response = await axios({
        method: isLiked ? 'DELETE' : 'POST',
        url: `${API_BASE}/creative/${postId}/like`,
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

  const handleViewProgress = (post) => {
    setViewingProgress(post);
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-extralight mb-4">
          <span className="text-orange-500">Creative</span>
        </h1>
        <p className="text-gray-400 text-lg font-light">
          Original human creativity with verified process documentation
        </p>
      </div>

      {/* Create Button */}
      <Link
        to="/creative/create"
        className="block w-full bg-gradient-to-r from-gray-900 to-gray-800 border-l-4 border-orange-500 rounded-lg p-6 mb-8 hover:from-gray-800 hover:to-gray-700 transition-all text-center"
      >
        <span className="text-orange-500 text-xl font-light">Start a New Creative Post</span>
      </Link>

      {/* Category Tabs */}
      <CategoryTabs 
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />

      {/* Posts Feed */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <p>Loading creative works...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No creative posts yet. Be the first to share your work!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {posts.map((post) => (
            <CreativePostCard
              key={post.id}
              post={post}
              onLikeToggle={handleLikeToggle}
              onViewProgress={handleViewProgress}
            />
          ))}
        </div>
      )}

      {posts.length > 0 && (
        <div className="text-center mt-12 text-gray-500">
          <p>End of creative works. Create something new above.</p>
        </div>
      )}

      {/* Progress Viewer Modal */}
      {viewingProgress && (
        <ProgressViewer
          post={viewingProgress}
          onClose={() => setViewingProgress(null)}
        />
      )}
    </div>
  );
};

export default Creative;