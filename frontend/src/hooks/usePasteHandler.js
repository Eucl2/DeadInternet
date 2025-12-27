import { useState } from 'react';

export const usePasteHandler = (duration = 4000) => {
  const [pasteMessage, setPasteMessage] = useState('');

  const handlePaste = (e) => {
    e.preventDefault();
    setPasteMessage('Copy-paste is not allowed. Write your content from scratch!');
    setTimeout(() => setPasteMessage(''), duration);
  };

  return { pasteMessage, handlePaste };
};