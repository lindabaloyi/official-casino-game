import { io } from 'socket.io-client';

// Initialize the socket connection
const URL = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3001';
export const socket = io(URL, {
  autoConnect: false // We will connect manually when the user enters the lobby
});
