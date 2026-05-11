import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { connectWebSocket, disconnectWebSocket, getStompClient } from '../services/websocket';
import { getLiveStats } from '../services/api';

export default function MatchmakingPage() {
  const [status, setStatus] = useState('IDLE'); // IDLE, SEARCHING, MATCHED
  const [liveUsers, setLiveUsers] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('chat_token');
    if (!token) {
      navigate('/');
      return;
    }

    // Fetch initial stats
    getLiveStats().then(data => {
      if (data && data.liveUsers !== undefined) {
        setLiveUsers(data.liveUsers);
      }
    });

    connectWebSocket(token, (frame) => {
      const client = getStompClient();
      
      // Subscribe to live stats
      client.subscribe('/topic/stats', (message) => {
        const data = JSON.parse(message.body);
        setLiveUsers(data.liveUsers || 0);
      });

      // Subscribe to personal queue for matchmaking events
      client.subscribe('/user/queue/match', (message) => {
        const data = JSON.parse(message.body);
        if (data.status === 'matched') {
          setStatus('MATCHED');
          setTimeout(() => {
            navigate('/chat', { state: { partner: data.partner, roomId: data.roomId } });
          }, 1500);
        } else if (data.status === 'waiting') {
          setStatus('SEARCHING');
        }
      });
    });

  }, [navigate]);

  const startSearch = () => {
    setStatus('SEARCHING');
    const client = getStompClient();
    if (client && client.connected) {
      client.publish({ destination: '/app/chat.findMatch', body: '' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('chat_token');
    disconnectWebSocket();
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', position: 'relative' }}>
      <button onClick={handleLogout} className="btn-danger" style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent' }}>Disconnect</button>
      
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <div className="live-counter">
          <div className="dot"></div>
          {liveUsers} STRANGERS LIVE
        </div>
        <h1 style={{ fontSize: '3rem', marginBottom: '10px' }} className="gradient-text">Aura Matchmaking</h1>
        <p className="text-muted">Initiate a secure, ephemeral connection.</p>
      </div>
      
      <div style={{ position: 'relative', width: '250px', height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {status === 'SEARCHING' && (
          <div className="aura-ring" style={{ width: '100%', height: '100%' }}></div>
        )}
        
        <button 
          onClick={startSearch} 
          disabled={status !== 'IDLE'}
          className="match-btn"
          style={{ 
            background: status === 'MATCHED' ? 'var(--accent-violet)' : 'var(--glass-bg)',
            color: 'white',
            border: status === 'IDLE' ? '1px solid var(--accent-cyan)' : '1px solid transparent',
            cursor: status === 'IDLE' ? 'pointer' : 'default',
            boxShadow: status === 'SEARCHING' ? '0 0 30px rgba(0, 240, 255, 0.2)' : '0 10px 30px rgba(0,0,0,0.5)'
          }}
        >
          {status === 'IDLE' ? 'FIND PARTNER' : status === 'SEARCHING' ? 'SEARCHING...' : 'CONNECTION SECURED'}
        </button>
      </div>
    </div>
  );
}
