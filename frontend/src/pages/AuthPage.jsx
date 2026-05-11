import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOtp, verifyOtp, getLiveStats } from '../services/api';
import { connectWebSocket, getStompClient } from '../services/websocket';

export default function AuthPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [liveUsers, setLiveUsers] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch initial stats
    getLiveStats().then(data => {
      if (data && data.liveUsers !== undefined) {
        setLiveUsers(data.liveUsers);
      }
    });

    // Connect as guest to get live stats
    connectWebSocket(null, () => {
      const client = getStompClient();
      if (client) {
        client.subscribe('/topic/stats', (message) => {
          const data = JSON.parse(message.body);
          setLiveUsers(data.liveUsers || 0);
        });
      }
    });
  }, []);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await sendOtp(phoneNumber);
      setStep(2);
    } catch (err) {
      setError('Failed to send OTP. Please check your number.');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { token } = await verifyOtp(phoneNumber, otp);
      localStorage.setItem('chat_token', token);
      navigate('/matchmaking');
    } catch (err) {
      setError('Invalid OTP. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-hero">
        <div className="live-counter">
          <div className="dot"></div>
          {liveUsers} STRANGERS LIVE IN THE VOID
        </div>
        <h1 className="gradient-text">Whisper into the void.</h1>
        <p>A completely new way to connect. No profiles. No history. Just instant, elegant conversation with someone, somewhere.</p>
        
        <div className="feature-list">
          <div className="feature-item">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
            </div>
            <div>
              <h3>Absolute Anonymity</h3>
              <span className="text-muted">No names, no tracking, just secure connections.</span>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
            </div>
            <div>
              <h3>Ephemeral Encounters</h3>
              <span className="text-muted">When the connection drops, the chat vanishes forever.</span>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            </div>
            <div>
              <h3>Instant Matching</h3>
              <span className="text-muted">Connect globally in milliseconds.</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="auth-form-container">
        <div className="glass-panel auth-form">
          <h2 style={{ marginBottom: '8px', textAlign: 'center' }}>Enter the Void</h2>
          <p className="text-muted" style={{ textAlign: 'center', marginBottom: '32px' }}>
            {step === 1 ? 'Verify your humanity to proceed' : 'Enter the transmission code'}
          </p>
          
          {error && <p style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>{error}</p>}
          
          {step === 1 ? (
            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={loading || !phoneNumber}>
                {loading ? 'Transmitting...' : 'Request Access'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <input
                  type="text"
                  placeholder="OTP Code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  style={{ letterSpacing: '8px', textAlign: 'center', fontSize: '20px', fontWeight: 'bold' }}
                />
              </div>
              <button type="submit" disabled={loading || !otp}>
                {loading ? 'Verifying...' : 'Initialize Connection'}
              </button>
              <button type="button" onClick={() => setStep(1)} style={{ background: 'transparent', color: 'var(--accent-cyan)', padding: 0, boxShadow: 'none' }}>
                Change Number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
