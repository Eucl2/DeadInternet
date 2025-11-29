import React, { useState } from 'react';
import axios from 'axios';

import { API_BASE } from '../config/constants';

const Profile = ({ user, onUserUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');

  const [newName, setNewName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

  const [newBio, setNewBio] = useState(user?.bio || '');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioError, setBioError] = useState('');
  const [bioSuccess, setBioSuccess] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [loading, setLoading] = useState(false);

  const [usernameError, setUsernameError] = useState('');
  const [usernameSuccess, setUsernameSuccess] = useState('');

  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');

  const handleUsernameUpdate = async (e) => {
    e.preventDefault();
    if (newUsername === user.username) {
      setIsEditing(false);
      return;
    }

    setLoading(true);
    setUsernameError('');
    setUsernameSuccess('');

    try {
      const token = localStorage.getItem('session_id');
      await axios.put(`${API_BASE}/auth/update-username`, {
        new_username: newUsername
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      onUserUpdate({ ...user, username: newUsername });
      setUsernameSuccess('Username updated successfully!');
      setIsEditing(false);
      
    } catch (err) {
      setUsernameError(err.response?.data?.detail || 'Failed to update username');
      setNewUsername(user.username);
    } finally {
      setLoading(false);
    }
  };

  const handleNameUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNameError('');
    setNameSuccess('');

    try {
      const token = localStorage.getItem('session_id');
      const response = await axios.put(`${API_BASE}/auth/set-name`, {
        new_name: newName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      onUserUpdate({ ...user, name: response.data.name });
      setNameSuccess('Name set successfully!');
      setIsEditingName(false);
      setNewName('');
    } catch (err) {
      setNameError(err.response?.data?.detail || 'Failed to set name');
    } finally {
      setLoading(false);
    }
  };

  const handleBioUpdate = async (e) => {
    e.preventDefault();
    
    if (newBio.trim().length > 100) {
      setBioError('Bio must be 100 characters or less');
      return;
    }

    setLoading(true);
    setBioError('');
    setBioSuccess('');

    try {
      const token = localStorage.getItem('session_id');
      await axios.put(`${API_BASE}/auth/update-bio`, {
        bio: newBio.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      onUserUpdate({ ...user, bio: newBio.trim() });
      setBioSuccess('Bio updated successfully!');
      setIsEditingBio(false);
    } catch (err) {
      setBioError(err.response?.data?.detail || 'Failed to update bio');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    
    try {
      const token = localStorage.getItem('session_id');
      await axios.delete(`${API_BASE}/auth/delete-account`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      localStorage.removeItem('session_id');
      window.location.href = '/';
    } catch (err) {
      alert('Failed to delete account');
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-extralight mb-8">
        <span className="text-orange-500">Profile</span> Settings
      </h1>

      {/* Profile Info */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-l-4 border-orange-500 rounded-lg p-8 mb-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Avatar Section */}
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl font-bold text-black">
                {user?.username?.[0]?.toUpperCase() || 'H'}
              </span>
            </div>
            <p className="text-gray-400 text-sm">Avatar (Coming Soon)</p>
          </div>

          {/* User Details */}
          <div className="space-y-6">

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
              
              {user?.name ? (
                <div className="flex flex-col">
                  <span className="text-lg text-white">{user.name}</span>
                  <p className="text-xs text-gray-500 mt-1">Name cannot be changed</p>
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  {isEditingName ? (
                    <form
                      onSubmit={handleNameUpdate}
                      className="flex space-x-3 w-full"
                    >
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded focus:border-orange-500 focus:outline-none"
                        minLength="3"
                        maxLength="30"
                        required
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-orange-500 text-black rounded hover:bg-orange-400 transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingName(false);
                          setNewName('');
                          setNameError('');
                        }}
                        className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="text-xs text-gray-500 mt-1">You have not assigned a name to your account</span>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="text-orange-500 hover:text-orange-400 transition-colors text-sm"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              )}

              {nameError && <div className="mt-2 text-red-400 text-sm">{nameError}</div>}
              {nameSuccess && <div className="mt-2 text-green-400 text-sm">{nameSuccess}</div>}
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
              {isEditing ? (
                <form onSubmit={handleUsernameUpdate} className="space-y-3">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded focus:border-orange-500 focus:outline-none"
                    minLength="3"
                    maxLength="20"
                    required
                  />
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-orange-500 text-black rounded hover:bg-orange-400 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setNewUsername(user.username);
                        setUsernameError('');
                      }}
                      className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-lg text-white">@{user?.username}</span>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-orange-500 hover:text-orange-400 transition-colors text-sm"
                  >
                    Edit
                  </button>
                </div>
              )}
              
              {usernameError && <div className="mt-2 text-red-400 text-sm">{usernameError}</div>}
              {usernameSuccess && <div className="mt-2 text-green-400 text-sm">{usernameSuccess}</div>}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Bio (max 100 characters)</label>
              {isEditingBio ? (
                <form onSubmit={handleBioUpdate} className="space-y-3">
                  <textarea
                    value={newBio}
                    onChange={(e) => setNewBio(e.target.value)}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded focus:border-orange-500 focus:outline-none resize-none"
                    rows="2"
                    maxLength={100}
                    placeholder="A short bio about yourself..."
                  />
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${newBio.length > 100 ? 'text-red-400' : 'text-gray-500'}`}>
                      {newBio.length}/100 characters
                    </span>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        disabled={loading || newBio.length > 100}
                        className="px-4 py-2 bg-orange-500 text-black rounded hover:bg-orange-400 transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingBio(false);
                          setNewBio(user.bio || '');
                          setBioError('');
                        }}
                        className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-lg text-white">{user?.bio || 'No bio yet'}</span>
                  <button
                    onClick={() => setIsEditingBio(true)}
                    className="text-orange-500 hover:text-orange-400 transition-colors text-sm"
                  >
                    {user?.bio ? 'Edit' : 'Add Bio'}
                  </button>
                </div>
              )}
              
              {bioError && <div className="mt-2 text-red-400 text-sm">{bioError}</div>}
              {bioSuccess && <div className="mt-2 text-green-400 text-sm">{bioSuccess}</div>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
              <span className="text-lg text-white">{user?.email}</span>
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            {/* Account Info */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Member Since</label>
              <span className="text-lg text-white">
                {new Date().toLocaleDateString()}
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* Account Settings */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-8">
        <h2 className="text-2xl font-light mb-6 text-orange-500">Account Settings</h2>
        <div className="space-y-4 text-gray-400">
          <div className="flex justify-between items-center py-3 border-b border-gray-700">
            <span>Change Password</span>
            <span className="text-sm">Coming Soon</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-700">
            <span>Privacy Settings</span>
            <span className="text-sm">Coming Soon</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-700">
            <span>Notification Preferences</span>
            <span className="text-sm">Coming Soon</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <div>
              <span className="text-red-400">Delete Account</span>
              <p className="text-xs text-gray-500 mt-1">Permanently delete your account and all data</p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-red-500 rounded-lg p-8 max-w-md">
            <h3 className="text-2xl font-light text-red-400 mb-4">Delete Account?</h3>
            <p className="text-gray-300 mb-6">
              This will permanently delete your account, all your posts, and all your data. 
              <br />
              This action cannot be undone.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete My Account'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;