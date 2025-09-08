import React, { useState, useContext, useEffect } from 'react';
import { SocketContext } from '../contexts/SocketContext';
import './styles/Lobby.css';

const Lobby = ({ onInviteReceived }) => {
  const socket = useContext(SocketContext);
  const [username, setUsername] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      console.log('Connected to server!');
    };

    const onDisconnect = () => {
      console.log('Disconnected from server');
    };

    const onPlayerListUpdate = (playerList) => {
      console.log('Lobby: Received update-player-list:', playerList);
      setPlayers(playerList);
      console.log('Lobby: Players state updated:', playerList);
    };

    // Handler for the socket event
    const handleInviteEvent = (data) => {
      onInviteReceived(data); // Call the function from props
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('update-player-list', onPlayerListUpdate);
    socket.on('server:receive-invite', handleInviteEvent);

    // Clean up on component unmount
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('update-player-list', onPlayerListUpdate);
      socket.off('server:receive-invite', handleInviteEvent);
      };
  }, [socket, onInviteReceived]);

  const handleRegister = (e) => {
    e.preventDefault();
    if (username.trim()) {
      socket.auth = { username };
      socket.connect();
      setIsRegistered(true);
    }
  };

  const handleInvite = (recipientId) => {
    if (socket) {
      socket.emit('client:send-invite', { recipientId });
      console.log(`Sending invite to ${recipientId}`);
    }
  };

  if (!isRegistered) {
    return (
      <div className="lobby-overlay">
        <form className="lobby-container" onSubmit={handleRegister}>
          <h2>Enter Your Name</h2>
          <input
            type="text"
            className="username-input"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
          <button type="submit" className="invite-button">Enter Lobby</button>
        </form>
      </div>
    );
  }

  return (
    <div className="lobby-overlay">
      <div className="lobby-container">
        <h2>Online Lobby</h2>
        <p>Players currently online:</p>
        <ul className="player-list">
          {players.map(player => (
            player.id !== socket.id && (
              <li key={player.id} className="player-item">
                <div className="player-info">
                  <span className="player-name">{player.username}</span>
                  <span className={`player-status status-${player.status}`}>{player.status.replace('-', ' ')}</span>
                </div>
                <button
                  className="invite-button"
                  onClick={() => handleInvite(player.id)}
                  disabled={player.status !== 'available'}
                >
                  {player.status === 'available' ? 'Invite' : 'Busy'}
                </button>
              </li>
            )
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Lobby;
