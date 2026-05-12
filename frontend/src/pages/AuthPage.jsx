import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendOtp, verifyOtp, getLiveStats } from '../services/api';
import { connectWebSocket, getStompClient } from '../services/websocket';

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
  </svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
  </svg>
);
const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>
);

export default function AuthPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [liveUsers, setLiveUsers] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    getLiveStats().then(data => {
      if (data?.liveUsers !== undefined) setLiveUsers(data.liveUsers);
    });

    connectWebSocket(null, () => {
      const client = getStompClient();
      if (client) {
        client.subscribe('/topic/stats', (msg) => {
          const d = JSON.parse(msg.body);
          setLiveUsers(d.liveUsers || 0);
        });
      }
    });
  }, []);

  const validateAndNormalise = (num) => {
    const stripped = num.replace(/[\s\-()]/g, '');
    const match = stripped.match(/^(\+91|91|0)?([6-9]\d{9})$/);
    if (!match) return null;
    return '+91' + match[2];
  };

  const [devOtpHint, setDevOtpHint] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const normalised = validateAndNormalise(phoneNumber);
    if (!normalised) {
      setError('Please enter a valid 10-digit Indian mobile number (6-9 series).');
      return;
    }
    setLoading(true); setError(''); setDevOtpHint('');
    try {
      const res = await sendOtp(normalised);
      setStep(2);
      // Dev mode: backend returns the OTP so we can auto-fill for testing
      if (res.__dev_otp) {
        setOtp(res.__dev_otp);
        setDevOtpHint(res.__dev_otp);
      }
    } catch (err) {
      setError(err?.message || 'Failed to send OTP. Please try again.');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const normalised = validateAndNormalise(phoneNumber);
    setLoading(true); setError('');
    try {
      const { token } = await verifyOtp(normalised || phoneNumber, otp);
      localStorage.setItem('chat_token', token);
      navigate('/matchmaking');
    } catch {
      setError('Invalid OTP. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      {/* ── Left / Mobile Form ── */}
      <div className="auth-form-wrap">
        <div className="auth-card glass-panel">
          {/* Logo + Brand */}
          <div className="auth-logo">
            <div className="auth-logo-icon">✦</div>
            <h2 className="gradient-text">Neon Aura</h2>
            <p className="text-muted" style={{ marginTop: 6 }}>
              {step === 1 ? 'Enter your phone to begin' : 'Enter the code we sent you'}
            </p>
          </div>

          {/* Live Badge (mobile only) */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <span className="live-badge">
              <span className="live-dot" />
              {liveUsers} strangers live now
            </span>
          </div>

          {error && (
            <div style={{
              background: 'rgba(255,51,102,0.1)',
              border: '1px solid rgba(255,51,102,0.2)',
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 16,
              fontSize: '0.85rem',
              color: 'var(--danger)',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {step === 2 && devOtpHint && (
            <div style={{
              background: 'rgba(0,229,255,0.08)',
              border: '1px solid rgba(0,229,255,0.3)',
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 16,
              fontSize: '0.85rem',
              color: 'var(--cyan)',
              textAlign: 'center',
              fontFamily: 'monospace'
            }}>
              🛠 Dev Mode — OTP: <strong style={{ fontSize: '1.1rem', letterSpacing: 4 }}>{devOtpHint}</strong>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSendOtp}>
              <div className="auth-field-group">
                <label className="field-label">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading || !phoneNumber}>
                {loading ? 'Sending code…' : 'Get Access Code →'}
              </button>
              <p className="auth-footer-note">
                We send a one-time code to verify it's you. No spam, ever.
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div className="auth-field-group">
                <label className="field-label">One-Time Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="● ● ● ● ● ●"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  required
                  autoFocus
                  style={{ letterSpacing: '10px', textAlign: 'center', fontSize: '1.3rem', fontWeight: 700 }}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading || !otp}>
                {loading ? 'Verifying…' : 'Enter the Void →'}
              </button>
              <div style={{ textAlign: 'center', marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => { setStep(1); setOtp(''); setError(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  ← Use a different number
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── Right / Desktop Feature Panel ── */}
      <div className="auth-feature-strip">
        <span className="live-badge" style={{ marginBottom: 24 }}>
          <span className="live-dot" />
          {liveUsers} strangers live right now
        </span>
        <h1 className="gradient-text">Whisper<br />into the void.</h1>
        <p className="text-muted" style={{ marginBottom: 48, maxWidth: 440 }}>
          A completely new way to connect. No profiles. No history. Just instant,
          ephemeral conversation with someone, somewhere in the world.
        </p>

        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon-box"><ShieldIcon /></div>
            <div>
              <h3>Absolute Anonymity</h3>
              <p>No names, no tracking. Your identity stays yours, always.</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon-box"><ClockIcon /></div>
            <div>
              <h3>Ephemeral by Design</h3>
              <p>When the connection drops, the conversation vanishes. Forever.</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon-box"><GlobeIcon /></div>
            <div>
              <h3>Instant Global Match</h3>
              <p>Connect with a stranger anywhere on earth in milliseconds.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
