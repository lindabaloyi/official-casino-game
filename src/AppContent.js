import React, { useState, useContext, useEffect } from 'react';
import GameBoard from './components/GameBoard';
import StartMenu from './components/StartMenu';
import Lobby from './components/Lobby';
import ActionModal from './components/ActionModal';
import { SocketContext } from './contexts/SocketContext';

const AppContent = () => {
  const socket = useContext(SocketContext);
  const [key, setKey] = useState(0);
  const [screen, setScreen] = useState('start'); // 'start', 'lobby', 'game'
  const [gameMode, setGameMode] = useState(null); // 'human', 'cpu', 'online'
  const [inviteDetails, setInviteDetails] = useState(null);

  const handlePlay = (mode) => {
    if (mode === 'online') {
      setScreen('lobby');
    } else {
      setGameMode(mode);
      setScreen('game');
    }
  };

  const handleInviteReceived = (data) => {
    console.log('AppContent: handleInviteReceived - data:', data);
    setInviteDetails(data);
    console.log('AppContent: inviteDetails set, modal should appear.');
  };

  const handleModalAction = (action) => {
    if (action === 'accept') {
      console.log('AppContent: handleModalAction - Accepting invite from', inviteDetails.senderUsername);
      socket.emit('client:accept-invite', { senderId: inviteDetails.senderId });
      console.log('AppContent: Emitted client:accept-invite');
    } else {
      console.log('AppContent: handleModalAction - Declining invite from', inviteDetails.senderUsername);
      socket.emit('client:decline-invite', { senderId: inviteDetails.senderId });
      console.log('AppContent: Emitted client:decline-invite');
    }
    setInviteDetails(null);
    console.log('AppContent: inviteDetails cleared, modal should hide.');
  };

  const handleRestart = () => {
    setKey((prev) => prev + 1);
    setScreen('start');
    setGameMode(null);
    setInviteDetails(null);
  };

  useEffect(() => {
    if (!socket) return;

    const onGameStart = (data) => {
      console.log('Game is starting:', data);
      setGameMode('online');
      setScreen('game');
    };

    // Listener for when the server confirms the game is starting
    socket.on('server:game-starting', onGameStart);

    return () => {
      socket.off('server:game-starting', onGameStart);
    };
  }, [socket]);


  const modalInfo = inviteDetails ? {
    title: 'Game Invite',
    message: `You have an invite to play from ${inviteDetails.senderUsername}`,
    actions: [
      { label: 'Accept', value: 'accept' },
      { label: 'Decline', value: 'decline' },
    ]
  } : null;

  return (
    <>
      {screen === 'start' && <StartMenu onPlay={handlePlay} />}
      {screen === 'lobby' && <Lobby onInviteReceived={handleInviteReceived} />}
      
      {screen === 'game' && (
        <GameBoard key={key} onRestart={handleRestart} gameMode={gameMode} />
      )}

      {modalInfo && (
          <ActionModal
            modalInfo={modalInfo}
            onAction={handleModalAction}
            onCancel={() => setInviteDetails(null)}
          />
      )}
    </>
  );
};

export default AppContent;
