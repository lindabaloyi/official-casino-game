import React from 'react';
import './styles/StartMenu.css';

const StartMenu = ({ onPlay }) => {
  return (
    <div className="start-menu-overlay">
      <div className="start-menu-section">
        <h1>Casino</h1>
        <div className="start-menu-actions">
          <button onClick={() => onPlay('human')}>Play vs Human</button>
          <button onClick={() => onPlay('cpu')}>Play vs CPU</button>
          <button onClick={() => onPlay('online')}>Play Online</button>
        </div>
      </div>
    </div>
  );
};

export default StartMenu;
