import { useState, useRef, useEffect } from 'react';

export const useTypingCapture = () => {
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

  const getTypingDataForSubmission = () => {
    const data = typingDataRef.current;
    const now = Date.now();

    if (!data.startTime || !data.firstCharTime) {
      return {
        totalTime: 0,
        thinkingTime: 0,
        backspaceCount: 0,
        pauseCount: 0,
        intervals: []
      };
    }

    return {
      totalTime: now - data.startTime,
      thinkingTime: data.firstCharTime - data.startTime,
      backspaceCount: data.backspaceCount,
      pauseCount: data.pauseCount,
      intervals: data.intervals
    };
  };

  return {
    handleFocus,
    handleKeyDown,
    getTypingDataForSubmission,
    resetTypingData
  };
};