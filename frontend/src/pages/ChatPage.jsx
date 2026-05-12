import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getStompClient } from '../services/websocket';
import { playSendSound, playReceiveSound } from '../services/audio';

const SendIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
);

export default function ChatPage() {
  const location = useLocation();
  const navigate  = useNavigate();
  const { partner, roomId } = location.state || {};

  const [messages, setMessages]           = useState([]);
  const [input, setInput]                 = useState('');
  const [isFading, setIsFading]           = useState(false);
  const [isPartnerTyping, setIsTyping]    = useState(false);
  const messagesEndRef  = useRef(null);
  const typingTimeout   = useRef(null);
  const inputRef        = useRef(null);

  const chatPageRef = useRef(null);

  /* ── Subscriptions ── */
  useEffect(() => {
    if (!partner || !roomId) { navigate('/matchmaking'); return; }

    const client = getStompClient();
    if (!client?.connected) { navigate('/matchmaking'); return; }

    // Lock body scroll so keyboard doesn't push header off screen on mobile
    document.body.classList.add('in-chat');

    // VisualViewport API: keep chat box anchored when keyboard opens (Android fallback)
    const handleViewportResize = () => {
      if (!chatPageRef.current) return;
      const vv = window.visualViewport;
      if (vv) {
        chatPageRef.current.style.height = vv.height + 'px';
        chatPageRef.current.style.top    = vv.offsetTop + 'px';
      }
    };
    window.visualViewport?.addEventListener('resize', handleViewportResize);
    window.visualViewport?.addEventListener('scroll', handleViewportResize);
    handleViewportResize(); // Call once on mount

    const sub = client.subscribe(`/topic/chat/${roomId}`, (message) => {
      const d = JSON.parse(message.body);

      if (d.type === 'LEAVE') {
        leave(false);
      } else if (d.type === 'TYPING') {
        if (d.sender === partner) setIsTyping(true);
      } else if (d.type === 'STOP_TYPING') {
        if (d.sender === partner) setIsTyping(false);
      } else {
        setMessages(prev => [...prev, d]);
        if (d.sender === partner) { setIsTyping(false); playReceiveSound(); }
        scrollBottom();
      }
    });

    return () => {
      sub.unsubscribe();
      document.body.classList.remove('in-chat');
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
      window.visualViewport?.removeEventListener('scroll', handleViewportResize);
    };
  }, [partner, roomId, navigate]);

  const scrollBottom = () => setTimeout(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, 80);

  /* ── Actions ── */
  const leave = (isSkip = false) => {
    setIsFading(true);
    setTimeout(() => navigate('/matchmaking', { state: { autoSearch: isSkip } }), 400);
  };

  const handleDisconnect = () => {
    getStompClient()?.publish({ destination: '/app/chat.leaveMatch', body: '' });
    leave(false);
  };

  const handleSkip = () => {
    getStompClient()?.publish({ destination: '/app/chat.leaveMatch', body: '' });
    leave(true);
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    const client = getStompClient();
    if (!client?.connected) return;

    client.publish({
      destination: '/app/chat.sendMessage',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ roomId, content: '', type: 'TYPING' }),
    });

    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      client.publish({
        destination: '/app/chat.sendMessage',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roomId, content: '', type: 'STOP_TYPING' }),
      });
    }, 1500);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    clearTimeout(typingTimeout.current);
    const client = getStompClient();
    if (client?.connected) {
      client.publish({
        destination: '/app/chat.sendMessage',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roomId, content: input.trim(), type: 'CHAT' }),
      });
      playSendSound();
      setInput('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  return (
    <div
      ref={chatPageRef}
      className="chat-page"
      style={{ opacity: isFading ? 0 : 1, transition: 'opacity 0.4s ease' }}
    >
      {/* ── Header ── */}
      <div className="chat-header">
        <img
          src={`https://api.dicebear.com/8.x/fun-emoji/svg?seed=${encodeURIComponent(partner)}&radius=50`}
          alt={partner}
          className="chat-avatar"
          style={{ background: 'var(--surface)', objectFit: 'cover' }}
          onError={e => { e.target.style.display='none'; }}
        />

        <div className="chat-header-info">
          <div className="chat-header-name">{partner}</div>
          <div className={`chat-header-status ${isPartnerTyping ? 'typing' : ''}`}>
            {isPartnerTyping ? 'typing…' : '🔒 End-to-end encrypted'}
          </div>
        </div>

        <div className="chat-header-actions">
          <button
            onClick={handleSkip}
            className="btn btn-ghost"
            title="Skip to next stranger"
            style={{ fontSize: '0.8rem', padding: '8px 14px' }}
          >
            Next ⏭
          </button>
          <button
            onClick={handleDisconnect}
            className="btn btn-danger"
            style={{ fontSize: '0.8rem', padding: '8px 14px' }}
          >
            Leave
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="chat-messages">
        <div className="chat-system-note">
          <span>✦ Anonymous · Ephemeral · Encrypted — This chat will vanish when either party leaves.</span>
        </div>

        {messages.map((msg, i) => {
          const isMe = msg.sender !== partner;
          // Show avatar for first message in a group or after partner's message
          return (
            <div
              key={i}
              className="message-row"
              style={{ justifyContent: isMe ? 'flex-end' : 'flex-start' }}
            >
              <div className={`message-bubble ${isMe ? 'message-sent' : 'message-received'}`}>
                {msg.content}
              </div>
            </div>
          );
        })}

        {isPartnerTyping && (
          <div className="message-row" style={{ justifyContent: 'flex-start' }}>
            <div className="typing-bubble">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Bar ── */}
      <form onSubmit={sendMessage} className="chat-input-bar">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Whisper something…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
        />
        <button
          type="submit"
          className={`send-btn ${input.trim() ? 'ready' : ''}`}
          disabled={!input.trim()}
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}
