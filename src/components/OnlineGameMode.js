import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../contexts/SocketContext';
import GameBoard from './GameBoard';

const OnlineGameMode = ({ gameData }) => {
  const socket = useContext(SocketContext);
  const [gameState, setGameState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  useEffect(() => {
    if (!socket || !gameData) return;

    console.log('OnlineGameMode: Connecting to game room', gameData.gameId);

    // Join the game room
    socket.emit('join-game', { gameId: gameData.gameId });

    // Set up game event listeners
    const handleGameUpdate = (update) => {
      console.log('OnlineGameMode: Received game update', update);
      setGameState(update);
      setIsConnected(true);
      setConnectionStatus('connected');
    };

    const handlePlayerJoined = (playerData) => {
      console.log('OnlineGameMode: Player joined', playerData);
      setConnectionStatus('waiting_for_opponent');
    };

    const handleGameError = (error) => {
      console.error('OnlineGameMode: Game error', error);
      alert(`Game Error: ${error.message}`);
    };

    // Listen for game events
    socket.on('game-update', handleGameUpdate);
    socket.on('player-joined', handlePlayerJoined);
    socket.on('game-error', handleGameError);

    // Cleanup on unmount
    return () => {
      socket.off('game-update', handleGameUpdate);
      socket.off('player-joined', handlePlayerJoined);
      socket.off('game-error', handleGameError);
    };
  }, [socket, gameData]);

  // Show loading state while connecting
  if (!isConnected || !gameState) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <p>Setting up your multiplayer game...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Once connected, render the existing GameBoard with multiplayer props
  return (
    <GameBoard
      gameMode="online"
      currentPlayerId={socket.id}
      gameState={gameState}
      onRestart={() => window.location.reload()} // Simple restart for now
    />
  );
};

export default OnlineGameMode;