import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { formatTimestamp } from '../utils/timeUtils';

import { API_BASE } from '../config/constants';

const ViewProfile = () => {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUser();
  }, [username]);

  const loadUser = async () => {
    try {
      const response = await axios.get(`${API_BASE}/users/${username}`);
      setUser(response.data);
    } catch (error) {
      setError('User not found');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-l-4 border-orange-500 rounded-lg p-8">
        <div className="flex items-start space-x-6">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-3xl font-bold text-black">
              {user.username[0].toUpperCase()}
            </span>
          </div>

          <div className="flex-1">
            <h1 className="text-3xl font-light text-white mb-2">
              @{user.username}
            </h1>
            
            {user.name && (
              <p className="text-xl text-gray-300 mb-4">{user.name}</p>
            )}

            {user.bio && (
              <p className="text-gray-400 mb-4">{user.bio}</p>
            )}

            <p className="text-sm text-gray-500">
              Human since {formatTimestamp(user.created_at)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewProfile;