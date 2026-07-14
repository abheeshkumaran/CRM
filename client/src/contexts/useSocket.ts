import { useContext } from 'react';
import { SocketContext } from './SocketContextObject';

export const useSocket = () => useContext(SocketContext);
