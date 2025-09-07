import React from 'react';
import { socket } from '../socket';

export const SocketContext = React.createContext();

export const SocketProvider = ({ children }) => {
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
