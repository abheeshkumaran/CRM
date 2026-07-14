import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { socketService } from '@/services/socketService';


import { SocketContext } from './SocketContextObject';


export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  useEffect(() => {
    const connectSocket = () => {
      const userInfoStr = localStorage.getItem('userInfo');
      if (userInfoStr) {
        try {
          const userInfo = JSON.parse(userInfoStr);
          if (userInfo.token) {
            socketService.connect(userInfo.id || userInfo._id);
            const socketInstance = socketService.getSocket();
            if (socketInstance) {
              setSocket(socketInstance);
              setConnected(socketInstance.connected);
              
              socketInstance.on('connect', () => {
                setConnected(true);
              });
              
              socketInstance.on('disconnect', () => {
                setConnected(false);
              });

              socketInstance.on('online_users_update', (data: { onlineUsers: string[] }) => {
                console.log('[SocketContext] Online users updated:', data.onlineUsers);
                setOnlineUsers(data.onlineUsers || []);
              });
            }
          }
        } catch (e) {
          console.error('Error parsing userInfo for socket:', e);
        }
      }
    };

    connectSocket();

    const handleAuthRefresh = () => {
      socketService.disconnect();
      setOnlineUsers([]);
      connectSocket();
    };

    window.addEventListener('auth-refresh' as any, handleAuthRefresh);
    window.addEventListener('storage', (e) => {
      if (e.key === 'userInfo') handleAuthRefresh();
    });

    return () => {
      window.removeEventListener('auth-refresh' as any, handleAuthRefresh);
      socketService.disconnect();
      setConnected(false);
      setOnlineUsers([]);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};
