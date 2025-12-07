export const API_BASE = process.env.REACT_APP_API_BASE || 'https://deadinternet-backend.onrender.com';

export const AVAILABLE_TAGS = [
  'Thoughts', 
  'Feelings', 
  'Facts', 
  'Travel', 
  'Food', 
  'Work', 
  'Learning', 
  'Creative'
];

export const POST_LIMITS = {
  MAX_LENGTH: 500,
  PASTE_MESSAGE_DURATION: 4000
};