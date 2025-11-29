import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../config/constants';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = ['Writing', 'Drawing', 'Photography'];

const CreateCreativePost = ({ user }) => {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState(''); // For Writing
  const [finalImage, setFinalImage] = useState(null);
  const [finalImagePreview, setFinalImagePreview] = useState(null);
  const [progressPhotos, setProgressPhotos] = useState([null, null, null]);
  const [progressCaptions, setProgressCaptions] = useState(['', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pasteMessage, setPasteMessage] = useState('');
  
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const progressInput0 = useRef(null);
  const progressInput1 = useRef(null);
  const progressInput2 = useRef(null);

  // Typing tracking for Writing category
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

  // const handlePaste = (e) => {
  //   e.preventDefault();
  //   setPasteMessage('Please type your creative work fresh!');
  //   setTimeout(() => setPasteMessage(''), 4000);
  // };

  const calculateTypingMetrics = () => {
    const data = typingDataRef.current;
    const now = Date.now();

    if (!data.startTime || !data.firstCharTime) {
      return null;
    }

    const totalTime = now - data.startTime;
    const thinkingTime = data.firstCharTime - data.startTime;
    const actualTypingTime = totalTime - thinkingTime;
    const charCount = content.length;
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

  const getProgressInputRef = (index) => {
    if (index === 0) return progressInput0;
    if (index === 1) return progressInput1;
    if (index === 2) return progressInput2;
  };

  const handleProgressPhotoCapture = (index) => {
    const ref = getProgressInputRef(index);
    if (ref && ref.current) {
      ref.current.click();
    }
  };

  const handleProgressPhotoChange = (index, file) => {
    if (file) {
      const newPhotos = [...progressPhotos];
      newPhotos[index] = file;
      setProgressPhotos(newPhotos);
    }
  };

  const handleFinalImageChange = (file) => {
    if (file) {
      setFinalImage(file);
      setFinalImagePreview(URL.createObjectURL(file));
    }
  };

  const canProceedToNextStep = () => {
    if (step === 1) return category !== '';
    if (step === 2) {
      // Writing doesnt require progress photos
      if (category === 'Writing') return true;
      return progressPhotos.filter(p => p).length >= 2;
    }
    if (step === 3) {
      if (category === 'Writing') return content.trim().length > 0;
      return finalImage !== null;
    }
    if (step === 4) return title.trim().length > 0;
    return false;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('session_id');
      const formData = new FormData();
      
      formData.append('title', title);
      formData.append('description', description || '');
      formData.append('category', category);

      if (category === 'Writing') {
        formData.append('content', content);
        
        // Add typing data
        const typingMetrics = calculateTypingMetrics();
        if (typingMetrics) {
          formData.append('typing_data', JSON.stringify(typingMetrics));
        }
      }

      // Add final image for Drawing/Photography
      if (category !== 'Writing' && finalImage) {
        formData.append('final_image', finalImage);
      }

      // Add progress photos
      progressPhotos.forEach((photo) => {
        if (photo) {
          formData.append('progress_photos', photo);
        }
      });

      // Add captions
      const captionsToSend = progressCaptions.filter((_, i) => progressPhotos[i]);
      formData.append('progress_captions', JSON.stringify(captionsToSend));

      const response = await axios.post(`${API_BASE}/creative`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Creative post created:', response.data);
      navigate('/creative');
    } catch (error) {
      console.error('Failed to create creative post:', error);
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (Array.isArray(detail)) {
          setError(detail.map(err => err.msg).join(', '));
        } else if (typeof detail === 'string') {
          setError(detail);
        } else {
          setError('Validation error occurred');
        }
      } else {
        setError('Failed to create post. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-extralight mb-4">
          <span className="text-orange-500">Create Creative Post</span>
        </h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span className={step >= 1 ? 'text-orange-500' : ''}>Category</span>
          <span>→</span>
          <span className={step >= 2 ? 'text-orange-500' : ''}>Progress Photos</span>
          <span>→</span>
          <span className={step >= 3 ? 'text-orange-500' : ''}>Final Work</span>
          <span>→</span>
          <span className={step >= 4 ? 'text-orange-500' : ''}>Details</span>
          <span>→</span>
          <span className={step >= 5 ? 'text-orange-500' : ''}>Review</span>
        </div>
      </div>

      <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-l-4 border-orange-500 rounded-lg p-8">
        {/* Step 1: Category Selection */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-light text-orange-500 mb-6">Select Category</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    category === cat
                      ? 'border-orange-500 bg-gray-800'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <span className="text-xl font-light">{cat}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Progress Photos */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-light text-orange-500 mb-2">Progress Photos</h2>
            <p className="text-gray-400 mb-6">Upload 2-3 photos showing your creative process</p>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[0, 1, 2].map((index) => (
                <div key={index}>
                  <input
                    type="file"
                    ref={getProgressInputRef(index)}
                    onChange={(e) => handleProgressPhotoChange(index, e.target.files[0])}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => handleProgressPhotoCapture(index)}
                    className={`w-full aspect-square rounded-lg border-2 border-dashed transition-all ${
                      progressPhotos[index]
                        ? 'border-orange-500'
                        : 'border-gray-700 hover:border-gray-600'
                    } flex items-center justify-center overflow-hidden`}
                  >
                    {progressPhotos[index] ? (
                      <img
                        src={URL.createObjectURL(progressPhotos[index])}
                        alt={`Progress ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-500">Stage {index + 1}</span>
                    )}
                  </button>
                  {progressPhotos[index] && (
                    <input
                      type="text"
                      placeholder="Caption (optional)"
                      value={progressCaptions[index]}
                      onChange={(e) => {
                        const newCaptions = [...progressCaptions];
                        newCaptions[index] = e.target.value;
                        setProgressCaptions(newCaptions);
                      }}
                      className="w-full mt-2 bg-gray-800 border border-gray-700 rounded p-2 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              {progressPhotos.filter(p => p).length}/3 photos uploaded (minimum 2 required)
            </p>
          </div>
        )}

        {/* Step 3: Final Work */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-light text-orange-500 mb-6">
              {category === 'Writing' ? 'Your Writing' : 'Final Image'}
            </h2>
            
            {category === 'Writing' ? (
              <div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={handleFocus}
                  //onPaste={handlePaste}
                  placeholder="Write your creative piece..."
                  className="w-full bg-gray-800 border border-gray-700 rounded p-4 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none"
                  rows="12"
                />
                {pasteMessage && (
                  <div className="text-orange-500 text-sm mt-2">{pasteMessage}</div>
                )}
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFinalImageChange(e.target.files[0])}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current.click()}
                  className={`w-full aspect-video rounded-lg border-2 border-dashed transition-all ${
                    finalImage
                      ? 'border-orange-500'
                      : 'border-gray-700 hover:border-gray-600'
                  } flex items-center justify-center overflow-hidden`}
                >
                  {finalImagePreview ? (
                    <img
                      src={finalImagePreview}
                      alt="Final work"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-500">Upload Final Image</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Details */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-light text-orange-500 mb-6">Add Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your work a title"
                  className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
                  maxLength={200}
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about your creative process..."
                  className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none"
                  rows="4"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div>
            <h2 className="text-2xl font-light text-orange-500 mb-6">Review & Post</h2>
            
            <div className="space-y-4 text-gray-300">
              <div>
                <span className="text-gray-500">Category:</span> {category}
              </div>
              <div>
                <span className="text-gray-500">Title:</span> {title}
              </div>
              {description && (
                <div>
                  <span className="text-gray-500">Description:</span> {description}
                </div>
              )}
              <div>
                <span className="text-gray-500">Progress Photos:</span> {progressPhotos.filter(p => p).length} uploaded
              </div>
              {category === 'Writing' && (
                <div>
                  <span className="text-gray-500">Content:</span> {content.length} characters
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded text-red-200">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => {
              if (step > 1) {
                if (step === 3 && category === 'Writing') {
                  setStep(1);
                } else {
                  setStep(step - 1);
                }
              } else {
                navigate('/creative');
              }
            }}
            className="px-6 py-2 border border-gray-700 rounded hover:border-gray-600 transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
            {step < 5 ? (
              <button
                onClick={() => {
                  // Skip progress photos for Writing
                  if (step === 1 && category === 'Writing') {
                    setStep(3);
                  } else {
                    setStep(step + 1);
                  }
                }}
                disabled={!canProceedToNextStep()}
                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-black font-medium rounded hover:from-orange-400 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-black font-medium rounded hover:from-orange-400 hover:to-orange-500 transition-all disabled:opacity-50"
            >
              {loading ? 'Posting...' : 'Post Creative Work'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateCreativePost;