import { Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import Pulse from './pages/Pulse';
import Profile from './pages/Profile';
import React, { useState, useEffect } from 'react';
import AuthModal from './components/AuthModal';
import AuthForms from './components/AuthForms';
import axios from 'axios'; 

function App() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const updateMousePosition = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', updateMousePosition);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, []);

  useEffect(() => {
    const session_id = localStorage.getItem('session_id');
    if (session_id && !user) {
      validateSession(session_id);
    }
  }, [user]);

  const validateSession = async (session_id) => {
    try {
      const response = await axios.get('http://localhost:8000/auth/validate-session', {
        params: { session_id }
      });
      setUser(response.data);
      console.log('Session valid, user restored:', response.data.username);
    } catch (error) {
      console.log('Session invalid, clearing');
      localStorage.removeItem('session_id');
    }
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setShowAuthModal(false);
    console.log('User authenticated:', userData);
    navigate('/Pulse');
  };

  const handleSignOut = () => {
    localStorage.removeItem('session_id');
    setUser(null);
    navigate('/');
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
  };

  const LandingPage = () => (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Mouse Light Effect */}
      <div 
        className="fixed pointer-events-none z-50 transition-opacity duration-300"
        style={{
          left: mousePosition.x - 75,
          top: mousePosition.y - 75,
          width: '150px',
          height: '150px',
          background: 'radial-gradient(circle, rgba(255, 102, 0, 0.3) 0%, rgba(255, 102, 0, 0.15) 40%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      {/* Hero Section */}
      <section className="px-12 py-32 text-center">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-8xl font-extralight mb-12 leading-none tracking-tighter">
            The Last <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600 font-light">Living</span> Network
          </h1>
          <p className="text-3xl mb-12 text-gray-300 font-extralight max-w-5xl mx-auto leading-relaxed tracking-wide">
            The only social media platform where every word, image, and moment is created by verified humans
          </p>
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 border-l-4 border-orange-500 rounded-lg p-10 mb-16 max-w-4xl mx-auto text-left shadow-2xl">
            <p className="text-xl text-orange-500 font-medium mb-3 tracking-wide">
              ZERO AI-GENERATED CONTENT
            </p>
            <p className="text-gray-300 leading-relaxed text-lg">
              No bots. No synthetic content. Just pure human connection in a digital world drowning in artificial noise.
            </p>
          </div>
          <button 
            onClick={() => {
              setAuthMode('register');
              setShowAuthModal(true);
            }}
            className="px-16 py-5 bg-gradient-to-r from-orange-500 to-orange-600 text-black text-xl font-medium rounded-sm hover:from-orange-400 hover:to-orange-500 transition-all duration-300 transform hover:scale-105 shadow-xl tracking-wide"
          >
            Enter Human Zone
          </button>
        </div>
      </section>

      {/* Stats Section*/}
      <section className="px-12 py-24 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-6xl font-extralight text-center mb-20 tracking-tight">
            The Internet <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">Crisis</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-16">
            
            {/* Stat 1: Bot Traffic*/}
            <div className="text-center group">
              <div className="text-7xl font-extralight text-transparent bg-clip-text bg-gradient-to-b from-orange-500 to-orange-600 mb-6">51%</div>
              <h3 className="text-2xl font-light mb-6 tracking-wide">Bot Traffic</h3>
              <p className="text-gray-400 leading-relaxed text-lg mb-4">
                For the first time in a decade, bots surpassed humans online in 2024.
              </p>
              <a href="https://www.imperva.com/blog/2025-imperva-bad-bot-report-how-ai-is-supercharging-the-bot-threat/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center text-xs text-gray-500 hover:text-orange-500 transition-colors border border-gray-700 hover:border-orange-500 px-3 py-1 rounded-full tracking-wide">
                <span>Imperva 2025</span>
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {/* Stat 2: Demand for Transparency*/}
            <div className="text-center group">
              <div className="text-7xl font-extralight text-transparent bg-clip-text bg-gradient-to-b from-orange-500 to-orange-600 mb-6">82%</div>
              <h3 className="text-2xl font-light mb-6 tracking-wide">Demand Transparency</h3>
              <p className="text-gray-400 leading-relaxed text-lg mb-4">
                Want platforms to label AI-generated content so they know what they're seeing.
              </p>
              <a href="https://dais.ca/reports/human-or-ai/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-gray-500 hover:text-orange-500 transition-colors border border-gray-700 hover:border-orange-500 px-3 py-1 rounded-full tracking-wide">
                <span>Dais Canada 2024</span>
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {/* Stat 3: Detection Difficulty*/}
            <div className="text-center group">
              <div className="text-7xl font-extralight text-transparent bg-clip-text bg-gradient-to-b from-orange-500 to-orange-600 mb-6">53%</div>
              <h3 className="text-2xl font-light mb-6 tracking-wide">Detection Rate</h3>
              <p className="text-gray-400 leading-relaxed text-lg mb-4">
                People can identify AI text only 53% of the time.
              </p>
              <a href="https://www.psu.edu/news/information-sciences-and-technology/story/qa-increasing-difficulty-detecting-ai-versus-human" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-gray-500 hover:text-orange-500 transition-colors border border-gray-700 hover:border-orange-500 px-3 py-1 rounded-full tracking-wide">
                <span>Penn State Research</span>
                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* Platform Spaces */}
      <section className="px-12 py-32">
        <div className="max-w-8xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-7xl font-extralight mb-8 tracking-tight">
              Three Spaces. <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">Pure Human.</span>
            </h2>
            <p className="text-2xl text-gray-400 max-w-4xl mx-auto leading-relaxed font-light tracking-wide">
              Every post created fresh in-app. No copy-paste allowed. No AI content allowed.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 mb-10">
            {/* Pulse */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border-l-4 border-orange-500 rounded-lg p-10 hover:from-gray-800 hover:to-gray-700 transition-all duration-300 shadow-xl">
              <h3 className="text-4xl font-extralight text-orange-500 mb-6 tracking-wide">Pulse</h3>
              <p className="text-gray-300 mb-8 leading-relaxed text-xl font-light">
                Chronological feed of verified human thoughts, feelings, and experiences. Full of raw, authentic human expression.
              </p>
              <div className="text-sm text-gray-500 uppercase tracking-widest font-light">
                Thoughts • Feelings • Facts • Authentic Expression
              </div>
            </div>

            {/* Creative */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border-l-4 border-orange-500 rounded-lg p-10 hover:from-gray-800 hover:to-gray-700 transition-all duration-300 shadow-xl">
              <h3 className="text-4xl font-extralight text-orange-500 mb-6 tracking-wide">Creative</h3>
              <p className="text-gray-300 mb-8 leading-relaxed text-xl font-light">
                Original art, writing, music, photography. Every piece includes verification of the human creative process behind it.
              </p>
              <div className="text-sm text-gray-500 uppercase tracking-widest font-light">
                Original Art • Human Creativity • Verified Process
              </div>
            </div>

            {/* Sparks */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border-l-4 border-orange-500 rounded-lg p-10 hover:from-gray-800 hover:to-gray-700 transition-all duration-300 shadow-xl">
              <h3 className="text-4xl font-extralight text-orange-500 mb-6 tracking-wide">Sparks</h3>
              <p className="text-gray-300 mb-8 leading-relaxed text-xl font-light">
                Anonymous daily questions creating data visualizations of collective human experience and wisdom.
              </p>
              <div className="text-sm text-gray-500 uppercase tracking-widest font-light">
                Daily Reflection • Anonymous • Collective Intelligence
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="px-12 py-32 text-center">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-7xl font-extralight mb-12 tracking-tight">
            Join the <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">Human</span> Network
          </h2>
          <p className="text-2xl text-gray-300 mb-16 leading-relaxed font-light tracking-wide">
            In a world where authenticity is becoming extinct, genuine human connection is the most radical act.
          </p>
          <div className="flex flex-col sm:flex-row gap-8 justify-center">
            <button 
              onClick={() => {
                setAuthMode('register');
                setShowAuthModal(true);
              }}
              className="px-16 py-5 bg-gradient-to-r from-orange-500 to-orange-600 text-black text-xl font-medium rounded-sm hover:from-orange-400 hover:to-orange-500 transition-all duration-300 transform hover:scale-105 shadow-xl tracking-wide"
            >
              Create Account
            </button>
            <button className="px-16 py-5 border-2 border-orange-500 text-orange-500 text-xl font-medium rounded-sm hover:bg-gradient-to-r hover:from-orange-500 hover:to-orange-600 hover:text-black transition-all duration-300 tracking-wide">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-12 py-16 border-t border-gray-800 bg-gradient-to-t from-gray-900 to-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-center mb-12">
            <div className="flex items-center space-x-4 mb-8 lg:mb-0">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-sm"></div>
              <span className="text-3xl font-extralight tracking-wider">DeadInternet</span>
              <span className="text-sm text-gray-500 ml-8 font-light tracking-wide">The Last Living Network</span>
            </div>
            <div className="flex space-x-10 text-sm text-gray-400">
              <a href="#" className="hover:text-orange-500 transition-colors tracking-wide">About</a>
              <a href="#" className="hover:text-orange-500 transition-colors tracking-wide">Privacy Policy</a>
              <a href="#" className="hover:text-orange-500 transition-colors tracking-wide">Terms of Service</a>
              <a href="#" className="hover:text-orange-500 transition-colors tracking-wide">Contact</a>
              <a href="#" className="hover:text-orange-500 transition-colors tracking-wide">Documentation</a>
            </div>
          </div>
          <div className="text-center text-xs text-gray-600 pt-8 border-t border-gray-800">
            <p className="tracking-wide">© 2025 DeadInternet Network.</p>
          </div>
        </div>
      </footer>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation bar*/}
      <nav className="flex justify-between items-center px-12 py-6 border-b border-gray-800 backdrop-blur-sm relative z-50">
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-sm"></div>
            <span className="text-2xl font-extralight tracking-wider">DeadInternet</span>
          </Link>
          {user && (
            <span className="text-gray-300 text-sm">Welcome, {user.name || user.username || 'Human'}</span>
          )}
        </div>

        {/* Search Bar */}
        {user && (
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Start searching..."
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
              <svg 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        )}
        
        <div className="flex items-center space-x-8">
          {user ? (
            <>
              <Link to="/pulse" className="text-white hover:text-orange-500 transition-colors">
                Pulse
              </Link>
              <button className="text-white hover:text-orange-500 transition-colors">
                Creative
              </button>
              <button className="text-white hover:text-orange-500 transition-colors">
                Sparks
              </button>
              <Link to="/profile" className="text-white hover:text-orange-500 transition-colors">
                Profile
              </Link>

              <button 
                onClick={handleSignOut}
                className="px-8 py-2 text-white hover:text-orange-500 transition-all duration-300 font-light tracking-wide"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => {
                  setAuthMode('signin');
                  setShowAuthModal(true);
                }}
                className="px-8 py-2 text-white hover:text-orange-500 transition-all duration-300 font-light tracking-wide"
              >
                Sign In
              </button>
              <button 
                onClick={() => {
                  setAuthMode('register');
                  setShowAuthModal(true);
                }}
                className="px-10 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-black font-medium rounded-sm hover:from-orange-400 hover:to-orange-500 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Join Network
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Authentication Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)}>
        <AuthForms onSuccess={handleAuthSuccess} initialMode={authMode} />
      </AuthModal>

      {/* Routes */}
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route 
          path="/pulse" 
          element={user ? <Pulse user={user} /> : <Navigate to="/" replace />} 
        />

        <Route 
          path="/profile" 
          element={user ? <Profile user={user} onUserUpdate={handleUserUpdate} /> : <Navigate to="/" replace />} 
        />

      </Routes>
      
    </div>
  );
}

export default App;
