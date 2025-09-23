import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const AuthForms = ({ onSuccess, initialMode = 'signin' }) => {
  const [isSignIn, setIsSignIn] = useState(initialMode === 'signin');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isMountedRef = useRef(true);

  // Cleanup to prevent memory leaks
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isSignIn ? '/auth/login' : '/auth/register';
      const payload = isSignIn 
        ? { username: formData.username, password: formData.password }
        : formData;

      const response = await axios.post(`${API_BASE}${endpoint}`, payload);
      
      console.log('Auth success:', response.data);
      
      if (isMountedRef.current) {
        localStorage.setItem('session_id', response.data.session_id);
        onSuccess(response.data.user);
      }
      
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.response?.data?.detail || 'Authentication failed');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="text-white">
      <div className="flex mb-6">
        <button
          className={`flex-1 py-2 px-4 rounded-l ${isSignIn ? 'bg-orange-500 text-black' : 'bg-gray-800'}`}
          onClick={() => setIsSignIn(true)}
        >
          Sign In
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-r ${!isSignIn ? 'bg-orange-500 text-black' : 'bg-gray-800'}`}
          onClick={() => setIsSignIn(false)}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded focus:border-orange-500 focus:outline-none"
          />
        </div>

        {!isSignIn && (
          <>
            <div>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <input
                type="text"
                name="name"
                placeholder="Full Name (optional)"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded focus:border-orange-500 focus:outline-none"
              />
            </div>
          </>
        )}

        <div>
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded focus:border-orange-500 focus:outline-none"
          />
        </div>

        {error && (
          <div className="text-red-400 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-black font-medium rounded hover:from-orange-400 hover:to-orange-500 transition-all disabled:opacity-50"
        >
          {loading ? 'Processing...' : (isSignIn ? 'Sign In' : 'Create Account')}
        </button>
      </form>
    </div>
  );
};

export default AuthForms;