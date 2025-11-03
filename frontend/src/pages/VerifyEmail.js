import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function VerifyEmail() {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const navigate = useNavigate();

  useEffect(() => {
    const verifyEmail = async () => {
      // Get token from URL
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      if (!token) {
        setStatus('error');
        setMessage('No verification token found.');
        return;
      }

      try {
        const response = await fetch(`http://localhost:8000/auth/verify-email?token=${token}`, {
          method: 'POST',
        });

        if (response.ok) {
          setStatus('success');
          setMessage('Email verified successfully! You can now log in.');
        } else {
          setStatus('error');
          const error = await response.json();
          setMessage(`Verification failed: ${error.detail || 'Unknown error'}`);
        }
      } catch (err) {
        setStatus('error');
        setMessage(`Error: ${err.message}`);
      }
    };

    verifyEmail();
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1>Email Verification</h1>
        <p style={{ fontSize: '18px', color: status === 'success' ? 'green' : status === 'error' ? 'red' : 'gray' }}>
          {message}
        </p>
      </div>

      <button 
        onClick={() => navigate('/')}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Go to Main Page
      </button>
    </div>
  );
}