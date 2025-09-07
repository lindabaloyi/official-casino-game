import React, { useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import GameBoard from './components/GameBoard';
import StartMenu from './components/StartMenu';
import Lobby from './components/Lobby';
import { NotificationProvider } from './components/styles/NotificationSystem';

import './App.css';

function App() {
  const [key, setKey] = useState(0);
  const [screen, setScreen] = useState('start'); // 'start', 'lobby', 'game'
  const [gameMode, setGameMode] = useState(null); // 'human', 'cpu', 'online'

  const handlePlay = (mode) => {
    if (mode === 'online') {
      setScreen('lobby');
    } else {
      setGameMode(mode);
      setScreen('game');
    }
  };

  const handleInviteAccepted = () => {
    setGameMode('online');
    setScreen('game');
  };

  const handleRestart = () => {
    setKey((prev) => prev + 1);
    setScreen('start');
    setGameMode(null);
  };

  return (
    <div className="App">
      <DndProvider backend={HTML5Backend}>
        <NotificationProvider>
          {screen === 'start' && <StartMenu onPlay={handlePlay} />}
          {screen === 'lobby' && <Lobby onInvite={() => { /* Placeholder */ }} />}
          <GameBoard key={key} onRestart={handleRestart} gameMode={gameMode} />
        </NotificationProvider>
      </DndProvider>
    </div>
  );
}

export default App;
