import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { NotificationProvider } from './components/styles/NotificationSystem';
import { SocketProvider } from './contexts/SocketContext';
import AppContent from './AppContent';

import './App.css';

function App() {
  return (
    <SocketProvider>
      <DndProvider backend={HTML5Backend}>
        <NotificationProvider>
          <div className="App">
            <AppContent />
          </div>
        </NotificationProvider>
      </DndProvider>
    </SocketProvider>
  );
}

export default App;
