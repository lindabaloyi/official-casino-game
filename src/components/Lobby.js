import React from 'react';
import './styles/Lobby.css';

const Lobby = ({ players = [], ownId, onInvite }) => {
  // Example players for UI development without a live server connection.
  const devPlayers = [
    { id: '1', username: 'PlayerOne', status: 'available' },
    { id: '2', username: 'PlayerTwo', status: 'in-game' },
    { id: '3', username: 'PlayerThree', status: 'pending-invite' },
    { id: '4', username: 'ThisIsYou', status: 'available' },
  ];

  const displayPlayers = players.length > 0 ? players : devPlayers;
  const currentOwnId = ownId || '4';

  return (
    <div className="lobby-overlay">
      <div className="lobby-container">
        <h2>Online Lobby</h2>
        <p>Players currently online:</p>
        <ul className="player-list">
          {displayPlayers.map(player => (
            player.id !== currentOwnId && (
              <li key={player.id} className="player-item">
                <div className="player-info">
                  <span className="player-name">{player.username}</span>
                  <span className={`player-status status-${player.status}`}>{player.status.replace('-', ' ')}</span>
                </div>
                <button
                  className="invite-button"
                  onClick={() => onInvite(player.id)}
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
