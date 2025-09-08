import React from 'react';
import { useLocalMultiplayerGame } from '../hooks/useLocalMultiplayerGame';
import PlayerHand from './PlayerHand';
import Table from './Table';

const GameBoard = ({ gameMode, onRestart }) => {
  // If it's a local game ('human' vs 'human'), use our local multiplayer hook.
  if (gameMode === 'human') {
    const { gameState, handleDeal, handlePlayCard } = useLocalMultiplayerGame();

    return (
      <div className="game-board">
        <div className="game-controls">
          <button onClick={handleDeal}>New Deal</button>
          <button onClick={onRestart}>New Game</button>
        </div>
        <p className="game-message">{gameState.gameMessage}</p>

        <Table
          looseCards={gameState.table.looseCards}
          builds={gameState.table.builds}
          onPlayCard={handlePlayCard}
        />
        <PlayerHand
          hand={gameState.player1Hand}
          onPlayCard={handlePlayCard}
          isCurrentPlayer={gameState.currentPlayer === 1}
        />
        {/* We can add the second player's hand here as well */}
      </div>
    );
  }

  // FUTURE: When you build the online mode, you'll add its logic here.
  if (gameMode === 'online') {
    // const { gameState, sendAction } = useOnlineMultiplayerGame();
    return <div>Online Mode - Coming Soon!</div>;
  }

  if (gameMode === 'cpu') {
    return <div>CPU Mode - Coming Soon!</div>;
  }

  return <div>Error: Unknown game mode. Please restart.</div>;
};

export default GameBoard;
