import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getStompClient } from '../services/websocket';
import { playSendSound, playReceiveSound } from '../services/audio';

export default function ChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { partner, roomId } = location.state || {};
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isShattering, setIsShattering] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!partner || !roomId) {
      navigate('/matchmaking');
      return;
    }

    const client = getStompClient();
    if (!client || !client.connected) {
      navigate('/matchmaking');
      return;
    }

    const subscription = client.subscribe(`/topic/chat/${roomId}`, (message) => {
      const data = JSON.parse(message.body);
      
      if (data.type === 'LEAVE') {
        triggerShatterAndLeave();
      } else if (data.type === 'TYPING') {
        if (data.sender === partner) setIsPartnerTyping(true);
      } else if (data.type === 'STOP_TYPING') {
        if (data.sender === partner) setIsPartnerTyping(false);
      } else {
        setMessages((prev) => [...prev, data]);
        if (data.sender === partner) {
          setIsPartnerTyping(false); // Stop typing indicator when message arrives
          playReceiveSound();
        }
        scrollToBottom();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [partner, roomId, navigate]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const triggerShatterAndLeave = (isSkip = false) => {
    setIsShattering(true);
    setTimeout(() => {
      navigate('/matchmaking', { state: { autoSearch: isSkip } });
    }, 500); 
  };

  const handleDisconnect = () => {
    const client = getStompClient();
    if (client && client.connected) {
      client.publish({ destination: '/app/chat.leaveMatch', body: '' });
    }
    triggerShatterAndLeave(false);
  };

  const handleSkip = () => {
    const client = getStompClient();
    if (client && client.connected) {
      client.publish({ destination: '/app/chat.leaveMatch', body: '' });
    }
    triggerShatterAndLeave(true);
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    const client = getStompClient();
    
    if (client && client.connected) {
      // Send typing event
      client.publish({ 
        destination: '/app/chat.sendMessage', 
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roomId, content: '', type: 'TYPING' }) 
      });

      // Clear existing timeout
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      // Set new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        client.publish({ 
          destination: '/app/chat.sendMessage', 
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ roomId, content: '', type: 'STOP_TYPING' }) 
        });
      }, 1500);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    const client = getStompClient();
    if (client && client.connected) {
      client.publish({ 
        destination: '/app/chat.sendMessage', 
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roomId, content: input, type: 'CHAT' }) 
      });
      playSendSound();
      setInput('');
    }
  };

  return (
    <div className="chat-container" style={{ opacity: isShattering ? 0 : 1, transition: 'opacity 0.5s ease' }}>
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-profile" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {partner.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '500' }}>{partner}</h3>
            {isPartnerTyping ? (
              <span style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontStyle: 'italic' }}>typing...</span>
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Connection Secure</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleSkip} style={{ background: 'transparent', border: '1px solid var(--accent-cyan)', padding: '8px 16px', color: 'var(--accent-cyan)', width: 'auto' }}>Next ⏭</button>
          <button onClick={handleDisconnect} className="btn-danger" style={{ background: 'transparent', padding: '8px 16px' }}>Disconnect</button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="chat-messages">
        <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 30px' }}>
          <div style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '12px', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}>
            Whispers are end-to-end encrypted. They disappear when the connection drops.
          </div>
        </div>
        
        {messages.map((msg, idx) => {
          const isMe = msg.sender !== partner;
          return (
            <div key={idx} className="message-row" style={{ justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div className={`message-bubble ${isMe ? 'message-sent' : 'message-received'}`}>
                {msg.content}
              </div>
            </div>
          );
        })}
        
        {isPartnerTyping && (
          <div className="message-row" style={{ justifyContent: 'flex-start' }}>
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="chat-input-area">
        <input 
          type="text" 
          value={input}
          onChange={handleInputChange}
          placeholder="Whisper into the void..." 
          autoFocus
          style={{ flex: 1, border: '1px solid var(--glass-border)' }}
        />
        <button type="submit" disabled={!input.trim()} style={{ 
          background: input.trim() ? 'linear-gradient(135deg, var(--accent-violet), var(--accent-cyan))' : 'var(--glass-bg)',
          border: input.trim() ? 'none' : '1px solid var(--glass-border)'
        }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </form>
    </div>
  );
}
