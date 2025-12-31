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
  MIN_CHARS: 10,
  MAX_LENGTH: 280,
  PASTE_MESSAGE_DURATION: 4000
};

export const COMMENT_LIMITS = {
  MIN_CHARS: 10,
  MAX_LENGTH: 280,
  PASTE_MESSAGE_DURATION: 4000
};

export const SPARK_LIMITS = {
  MIN_CHARS: 5,
  MAX_LENGTH: 50,
  PASTE_MESSAGE_DURATION: 4000
};

export const BIO_LIMITS = {
  MIN_CHARS: 10,
  MAX_LENGTH: 280,
  PASTE_MESSAGE_DURATION: 4000
};

export const CREATIVE_POST_LIMITS = {
  TITLE_MIN_CHARS: 10,
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MIN_CHARS: 10,
  DESCRIPTION_MAX_LENGTH: 280,
  PASTE_MESSAGE_DURATION: 4000
};