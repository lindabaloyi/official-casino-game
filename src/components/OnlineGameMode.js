import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../contexts/SocketContext';
import GameBoard from './GameBoard';
import { initializeGame } from './game-logic/game-state'; // Import the game initializer

const OnlineGameMode = ({ gameData }) => {
  const socket = useContext(SocketContext);
  const [gameState, setGameState] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  useEffect(() => {
    if (!socket || !gameData) return;

    // --- NEW LISTENERS for host-client initialization ---
    const handleInitializeGame = ({ gameId, players }) => {
      console.log('👑 You are the host. Initializing game state...');
      setConnectionStatus('initializing');
      const newGameState = initializeGame();
      
      // The server gives us the player info, but initializeGame creates the structure.
      // We need to merge these so the player IDs and usernames are correct from the start.
      const finalGameState = {
        ...newGameState,
        gameId,
        players: newGameState.playerHands.map((hand, index) => ({
          ...(players[index] || {}),
          hand,
        })),
      };

      // Send the authoritative game state to the server to be broadcast.
      socket.emit('client:game-state-initialized', { gameId, gameState: finalGameState });
    };

    const handleWaiting = ({ hostUsername }) => {
      console.log(`Waiting for ${hostUsername} to initialize the game...`);
      setConnectionStatus(`waiting_for_host`);
    };

    // --- CORE GAME LISTENERS ---
    const handleGameUpdate = (update) => {
      console.log('🔍 OnlineGameMode: Received game update', update);
      setGameState(update);
      setConnectionStatus('connected');
    };

    const handleGameError = (error) => {
      console.error('OnlineGameMode: Game error', error);
      alert(`Game Error: ${error.message}`);
    };

    // Listen for game events
    socket.on('server:initialize-game', handleInitializeGame);
    socket.on('server:waiting-for-initialization', handleWaiting);
    socket.on('game-update', handleGameUpdate);
    socket.on('game-error', handleGameError);

    // Let the server know this client is loaded and ready.
    console.log('[ONLINE_GAME_MODE] Component mounted. Emitting client:player-ready.');
    socket.emit('client:player-ready', { gameId: gameData.gameId });

    // Cleanup on unmount
    return () => {
      socket.off('server:initialize-game', handleInitializeGame);
      socket.off('server:waiting-for-initialization', handleWaiting);
      socket.off('game-update', handleGameUpdate);
      socket.off('game-error', handleGameError);
    };
  }, [socket, gameData]);

  // Show loading/waiting state while connecting or initializing
  if (!gameState) {
    let statusMessage = 'Setting up your multiplayer game...';
    if (connectionStatus === 'initializing') {
      statusMessage = 'Setting up the deck and dealing cards...';
    }
    if (connectionStatus === 'waiting_for_host') {
      statusMessage = 'Waiting for the other player to set up the game...';
    }

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
        <p>{statusMessage}</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Once connected and state is received, render the GameBoard
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