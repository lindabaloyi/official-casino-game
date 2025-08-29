import React, { useState, useCallback } from 'react';
import PlayerHand from './PlayerHand';
import TableCards from './TableCards';
import { useDrop } from 'react-dnd';

import {
  initializeGame,
  handleBuild,
  handleTrail,
  handleCapture,
} from './game-logic';
import CapturedCards from './CapturedCards';

const ItemTypes = {
  CARD: 'card',
};

function GameBoard({ onRestart }) {
  const [gameState, setGameState] = useState(initializeGame());

  const handleTrailCard = useCallback((card, player) => {
    setGameState(currentGameState => {
      if (player !== currentGameState.currentPlayer) {
        alert("It's not your turn!");
        return currentGameState;
      }
      // handleTrail returns the new state, which will be used to update the game state.
      return handleTrail(currentGameState, card);
    });
  }, []); // No dependency on gameState, so this function is stable.

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.CARD,
    drop: (item) => handleTrailCard(item.card, item.player),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [handleTrailCard]);

  const rankValue = (rank) => {
    if (rank === 'A') return 1;
    if (rank === 'J') return 11;
    if (rank === 'Q') return 12;
    if (rank === 'K') return 13;
    return parseInt(rank, 10);
  };

  const isActive = isOver && canDrop;

  return (
    <div ref={drop} className={`game-board ${isActive ? 'active-drop' : ''}`}>
      <div className="status-section">
        <p>Round: {gameState.round}</p>
      </div>
      <div className="captured-cards-section">
        {gameState.playerCaptures.map((capturedCards, index) => (
          <CapturedCards key={index} player={index} cards={capturedCards} />
        ))}
      </div>
      <div className="table-cards-section">
        <TableCards
          cards={gameState.tableCards}
        />
      </div>
      <div className="player-hands-section">
        {gameState.playerHands
          .map((hand, index) => (
            <PlayerHand
              key={index}
              player={index}
              cards={hand}
              isCurrent={gameState.currentPlayer === index}
            />
          ))}
      </div>
      {gameState.gameOver && (
        <div className="game-over-section">
          <h2>Game Over</h2>
          <p>Winner: Player {gameState.winner + 1}</p>
          <button onClick={onRestart}>Play Again</button>
        </div>
      )}
    </div>
  );
}

export default GameBoard;
