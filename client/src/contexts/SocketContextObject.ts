import { createContext, type Context } from 'react';
import { Socket } from 'socket.io-client';

export interface SocketContextType {
    socket: Socket | null;
    connected: boolean;
    onlineUsers: string[];
}

export const SocketContext: Context<SocketContextType> = createContext<SocketContextType>({ 
    socket: null, 
    connected: false,
    onlineUsers: [] 
});
