import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

let stompClient = null;

export const connectWebSocket = (token, onConnect, onError) => {
  if (stompClient !== null && stompClient.active) {
    if (stompClient.connected) {
      if (onConnect) onConnect();
    } else {
      // It's still connecting, so we just override the onConnect callback
      const oldOnConnect = stompClient.onConnect;
      stompClient.onConnect = (frame) => {
        if (oldOnConnect) oldOnConnect(frame);
        if (onConnect) onConnect(frame);
      };
    }
    return;
  }

  const socket = new SockJS('http://localhost:8080/ws');
  
  const connectHeaders = {};
  if (token) {
    connectHeaders.Authorization = `Bearer ${token}`;
  }
  
  stompClient = new Client({
    webSocketFactory: () => socket,
    connectHeaders: connectHeaders,
    debug: function (str) {
      console.log('STOMP: ' + str);
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
  });

  stompClient.onConnect = (frame) => {
    onConnect(frame);
  };

  stompClient.onStompError = (frame) => {
    console.error('Broker reported error: ' + frame.headers['message']);
    console.error('Additional details: ' + frame.body);
    if (onError) onError(frame);
  };

  stompClient.activate();
};

export const disconnectWebSocket = () => {
  if (stompClient !== null) {
    stompClient.deactivate();
  }
};

export const getStompClient = () => stompClient;
