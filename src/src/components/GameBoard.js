import React, { useState, useCallback } from 'react';
import PlayerHand from './PlayerHand';
import TableCards from './TableCards';
import { useDrop } from 'react-dnd';

import {
  initializeGame,
  handleBuild,
  rankValue,
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

  // New handler for dropping a card on another card
  const handleDropOnCard = useCallback((draggedItem, targetCard) => {
    // This handler is called when a card is dropped on a CardStack.
    // If the targetCard is null, it means the drop was on the stack but not a specific card.
    // We should prevent any action to avoid ambiguity.
    if (!targetCard || !draggedItem || !draggedItem.card) {
      console.warn("Drop on card stack was ambiguous, no action taken.");
      return;
    }

    setGameState(currentGameState => {
      const { currentPlayer, playerHands } = currentGameState;
      const playerHand = playerHands[currentPlayer];
      const draggedCard = draggedItem.card;

      // 1. Check if it's the current player's turn.
      if (draggedItem.player !== currentPlayer) {
        alert("It's not your turn!");
        return currentGameState;
      }

      // 2. Determine if a BUILD is possible.
      const buildValue = rankValue(draggedCard.rank) + rankValue(targetCard.rank);
      const canBuild = playerHand.some(
        c => rankValue(c.rank) === buildValue && (c.rank !== draggedCard.rank || c.suit !== draggedCard.suit)
      );

      // 3. Determine if a simple CAPTURE is possible.
      const canCapture = rankValue(draggedCard.rank) === rankValue(targetCard.rank);

      // 4. Execute the action, prioritizing Build over Capture.
      if (canBuild) {
        return handleBuild(currentGameState, draggedCard, [targetCard], buildValue);
      } else if (canCapture) {
        return handleCapture(currentGameState, draggedCard, [targetCard]);
      } else {
        alert("Invalid move. You cannot build or capture with these cards.");
        return currentGameState;
      }
    });
  }, []);

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.CARD,
    drop: (item, monitor) => {
      // If a nested drop target has already handled the drop, do nothing.
      if (monitor.didDrop()) {
        return;
      }
      handleTrailCard(item.card, item.player);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [handleTrailCard]);

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
          onDropOnCard={handleDropOnCard}
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
