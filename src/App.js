import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import GameBoard from './components/GameBoard';
import StartMenu from './components/StartMenu';
import { NotificationProvider } from './components/styles/NotificationSystem';

import './App.css';

function App() {
  const [key, setKey] = useState(0);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [gameMode, setGameMode] = useState(null); // 'human' or 'cpu'

  const handlePlay = (mode) => {
    setGameMode(mode);
    setIsGameStarted(true);
  };

  const handleRestart = () => {
    setKey((prev) => prev + 1);
    setIsGameStarted(false);
    setGameMode(null);
  };

  return (
    <div className="App">
      <DndProvider backend={HTML5Backend}>
        <NotificationProvider>
          {!isGameStarted && <StartMenu onPlay={handlePlay} />}
          <GameBoard key={key} onRestart={handleRestart} gameMode={gameMode} />
        </NotificationProvider>
      </DndProvider>
    </div>
  );
}

export default App;
