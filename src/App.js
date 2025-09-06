import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import GameBoard from './components/GameBoard';
import { NotificationProvider } from './components/styles/NotificationSystem';

import './App.css';

function App() {
  const [key, setKey] = useState(0);

  const handleRestart = () => {
    setKey((prev) => prev + 1);
  };

  return (
    <div className="App">
      <DndProvider backend={HTML5Backend}>
        <NotificationProvider>
          <GameBoard key={key} onRestart={handleRestart} />
        </NotificationProvider>
      </DndProvider>
    </div>
  );
}

export default App;
