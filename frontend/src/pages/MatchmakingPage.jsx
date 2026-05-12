import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { connectWebSocket, disconnectWebSocket, getStompClient } from '../services/websocket';
import { getLiveStats, signOut } from '../services/api';

export default function MatchmakingPage() {
  const [status, setStatus] = useState('IDLE');
  const [liveUsers, setLiveUsers] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('chat_token');
    if (!token) { navigate('/'); return; }

    getLiveStats().then(data => {
      if (data?.liveUsers !== undefined) setLiveUsers(data.liveUsers);
    });

    connectWebSocket(token, () => {
      const client = getStompClient();

      client.subscribe('/topic/stats', (msg) => {
        const d = JSON.parse(msg.body);
        setLiveUsers(d.liveUsers || 0);
      });

      client.subscribe('/user/queue/match', (msg) => {
        const d = JSON.parse(msg.body);
        if (d.status === 'matched') {
          setStatus('MATCHED');
          setTimeout(() => {
            navigate('/chat', { state: { partner: d.partner, roomId: d.roomId } });
          }, 1200);
        } else if (d.status === 'waiting') {
          setStatus('SEARCHING');
        }
      });

      // Auto-search if redirected from a Skip action
      if (location.state?.autoSearch) {
        setStatus('SEARCHING');
        client.publish({ destination: '/app/chat.findMatch', body: '' });
      }
    });
  }, [navigate, location.state?.autoSearch]);


  const startSearch = () => {
    const client = getStompClient();
    if (client?.connected) {
      setStatus('SEARCHING');
      client.publish({ destination: '/app/chat.findMatch', body: '' });
    }
  };

  const cancelSearch = () => {
    const client = getStompClient();
    if (client?.connected) {
      setStatus('IDLE');
      client.publish({ destination: '/app/chat.leaveMatch', body: '' });
    }
  };

  const handleLogout = async () => {
    try { await signOut(); } catch (_) {}   // Best-effort — always clear local state
    localStorage.removeItem('chat_token');
    disconnectWebSocket();
    navigate('/');
  };

  const isSearching = status === 'SEARCHING';
  const isMatched  = status === 'MATCHED';

  return (
    <div className="matchmaking-page">
      {/* Top-right logout */}
      <div className="matchmaking-topbar">
        <button onClick={handleLogout} className="btn btn-danger">Sign out</button>
      </div>

      {/* Info block */}
      <div className="matchmaking-info">
        <span className="live-badge" style={{ marginBottom: 20 }}>
          <span className="live-dot" />
          {liveUsers} {liveUsers === 1 ? 'stranger' : 'strangers'} live now
        </span>
        <h1 className={isMatched ? 'gradient-text' : ''}>
          {isMatched ? 'Connected!' : isSearching ? 'Searching…' : 'Find a Stranger'}
        </h1>
        <p className="text-muted" style={{ marginTop: 10 }}>
          {isMatched
            ? 'A connection was secured. Entering the void…'
            : isSearching
            ? 'Scanning the void for a signal…'
            : 'Tap the orb to initiate an anonymous connection.'}
        </p>
      </div>

      {/* Orb / Match Button */}

      <div className="match-orbit">
        {isSearching && (
          <>
            <div className="aura-ring" />
            <div className="aura-ring-2" />
            <div className="aura-ring-3" />
          </>
        )}

        {/* Show Cancel button when searching, otherwise show Find Partner button */}
        {isSearching ? (
          <button
            className="match-btn searching"
            onClick={cancelSearch}
            disabled={isMatched}
          >
            <span className="btn-icon-inner">✖</span>
            <span className="btn-label">Cancel</span>
          </button>
        ) : (
          <button
            className={`match-btn ${isMatched ? 'matched' : ''}`}
            onClick={startSearch}
            disabled={status !== 'IDLE'}
          >
            <span className="btn-icon-inner">
              {isMatched ? '✦' : '⊕'}
            </span>
            <span className="btn-label">
              {isMatched ? 'Connected' : 'Find Partner'}
            </span>
          </button>
        )}
      </div>

      {/* Footer hint */}
      {status === 'IDLE' && (
        <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: -20 }}>
          Anonymous · Encrypted · Ephemeral
        </p>
      )}
    </div>
  );
}
