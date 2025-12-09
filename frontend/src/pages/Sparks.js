import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE, SPARK_LIMITS } from '../config/constants';
import { formatTimestamp } from '../utils/timeUtils';

const Sparks = ({ user }) => {
  const [spark, setSpark] = useState(null);
  const [responses, setResponses] = useState([]);
  const [newResponse, setNewResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pasteMessage, setPasteMessage] = useState('');
  const [alreadyResponded, setAlreadyResponded] = useState(false);

  useEffect(() => {
    loadDailySpark();
  }, []);

  const loadDailySpark = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('session_id');
      const response = await axios.get(`${API_BASE}/sparks/daily`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSpark(response.data);
      setResponses(response.data.responses || []);
      setAlreadyResponded(response.data.user_has_responded);
    } catch (error) {
      console.error('Failed to load spark:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    setPasteMessage('Please type your thoughts fresh!');
    setTimeout(() => setPasteMessage(''), 4000);
  };

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    if (!newResponse.trim()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('session_id');
      const sparkResponse = await axios.post(
        `${API_BASE}/sparks/daily/responses`,
        { content: newResponse },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setResponses([sparkResponse.data, ...responses]);
      setNewResponse('');
      setAlreadyResponded(true);
      
      // Reload to get updated stats from backend
      await loadDailySpark();
    } catch (error) {
      console.error('Failed to submit response:', error);
      if (error.response?.data?.detail) {
        setPasteMessage(error.response.data.detail);
        setTimeout(() => setPasteMessage(''), 5000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!spark) {
    return <div className="text-center py-12 text-gray-500">No spark available</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-extralight mb-8">
        <span className="text-orange-500">Sparks</span>
      </h1>

      {/* Daily Question */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-l-4 border-orange-500 rounded-lg p-8 mb-8">
        <p className="text-gray-400 text-sm uppercase tracking-wide mb-2">Today's Question</p>
        <h2 className="text-2xl text-white font-light mb-6">{spark.question}</h2>

        {/* Response Form */}
        {!alreadyResponded ? (
          <form onSubmit={handleSubmitResponse}>
            <textarea
              value={newResponse}
              onChange={(e) => setNewResponse(e.target.value)}
              onPaste={handlePaste}
              placeholder="Share your thoughts anonymously..."
              className="w-full bg-gray-800 border border-gray-700 rounded p-4 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none"
              rows="4"
              maxLength={SPARK_LIMITS.MAX_LENGTH}
            />
            {pasteMessage && (
              <div className="text-orange-500 text-sm mt-2">{pasteMessage}</div>
            )}
            <div className="flex justify-between items-center mt-4">
              <span className="text-sm text-gray-500">{newResponse.length}/{SPARK_LIMITS.MAX_LENGTH} characters</span>
              <button
                type="submit"
                disabled={submitting || !newResponse.trim()}
                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-black font-medium rounded hover:from-orange-400 hover:to-orange-500 transition-all disabled:opacity-50"
              >
                {submitting ? 'Sharing...' : 'Share Answer'}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded p-4 text-gray-300 text-center">
            You've already shared your thoughts today. Come back tomorrow!
          </div>
        )}
      </div>





      {/* Stats Section */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-l-4 border-orange-500 rounded-lg p-8 mb-8">
        <h3 className="text-orange-500 text-sm uppercase tracking-wide mb-6">Statistics</h3>
        
        <div className="grid grid-cols-3 gap-6">
          {/* Total Responses */}
          <div className="text-center">
            <p className="text-gray-500 text-xs uppercase mb-2">Total Responses</p>
            <p className="text-3xl font-light text-white">{spark.stats?.total_responses || 0}</p>
          </div>

          {/* Avg Length */}
          <div className="text-center">
            <p className="text-gray-500 text-xs uppercase mb-2">Avg. Length</p>
            <p className="text-3xl font-light text-white">{spark.stats?.average_length || 0} <span className="text-lg text-gray-400">chars</span></p>
          </div>

          {/* Most Common */}
          <div className="text-center">
            <p className="text-gray-500 text-xs uppercase mb-2">Most Common</p>
            <p className="text-lg font-light text-white break-words max-h-20 overflow-hidden">
              {spark.stats?.most_common_response ? `"${spark.stats.most_common_response.content}"` : "—"}
            </p>
            {spark.stats?.most_common_response && (
              <p className="text-xs text-gray-500 mt-2">{spark.stats.most_common_response.count} people</p>
            )}
          </div>
        </div>
      </div>



      

      {/* Responses */}
      <div>
        <h3 className="text-lg font-light mb-4 text-white">Responses</h3>
        <div className="space-y-3">
          {responses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No responses yet. Be the first to share!</p>
            </div>
          ) : (
            responses.map((response) => (
              <div key={response.id} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-gray-500 uppercase">Anonymous</span>
                  <span className="text-xs text-gray-500">{formatTimestamp(response.created_at)}</span>
                </div>
                <p className="text-gray-300 leading-relaxed break-words">{response.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Sparks;