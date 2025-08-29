import React, { useState, useCallback } from 'react';
import PlayerHand from './PlayerHand';
import TableCards from './TableCards';
import { useDrop } from 'react-dnd';

import {
  initializeGame,
  handleBuild,
  rankValue,
  handleAddToBuild,
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
  const handleDropOnCard = useCallback((draggedItem, targetInfo) => {
    if (!targetInfo || !draggedItem || !draggedItem.card) {
      console.warn("Drop on card stack was ambiguous, no action taken.");
      return;
    }

    setGameState(currentGameState => {
      const { currentPlayer, playerHands, tableCards } = currentGameState;
      const playerHand = playerHands[currentPlayer];
      const draggedCard = draggedItem.card;

      // 1. Check if it's the current player's turn.
      if (draggedItem.player !== currentPlayer) {
        alert("It's not your turn!");
        return currentGameState;
      }

      // --- ACTION LOGIC ---

      // CASE 1: Dropped on a BUILD
      if (targetInfo.type === 'build') {
        const build = tableCards.find(c => c.buildId === targetInfo.buildId);
        if (!build) return currentGameState; // Build might have been captured by another action

        // Action A: CAPTURE the build
        if (rankValue(draggedCard.rank) === build.value) {
          return handleCapture(currentGameState, draggedCard, build.cards);
        }

        // If capture is not possible, the move is invalid. Provide a clear, direct reason.
        alert(`Cannot use a ${draggedCard.rank} to capture a build of ${build.value}. The values must match.`);
        return currentGameState;
      }

      // CASE 2: Dropped on a LOOSE CARD
      if (targetInfo.type === 'loose') {
        const looseCard = tableCards.find(c => !c.type && c.rank === targetInfo.rank && c.suit === targetInfo.suit);
        if (!looseCard) return currentGameState; // Card might have been captured

        const buildValue = rankValue(draggedCard.rank) + rankValue(looseCard.rank);
        const canBuild = playerHand.some(c => rankValue(c.rank) === buildValue && (c.rank !== draggedCard.rank || c.suit !== draggedCard.suit));
        const canCapture = rankValue(draggedCard.rank) === rankValue(looseCard.rank);

        const existingBuild = tableCards.find(
          item => item.type === 'build' && item.owner === currentPlayer && item.value === buildValue
        );
        if (existingBuild) {
          return handleAddToBuild(currentGameState, draggedCard, looseCard, existingBuild);
        }

        if (canBuild) {
          return handleBuild(currentGameState, draggedCard, [looseCard], buildValue);
        }

        if (canCapture) return handleCapture(currentGameState, draggedCard, [looseCard]);

        alert("Invalid move. You cannot build or capture with these cards.");
        return currentGameState;
      }

      // Default case if targetInfo.type is unknown
      return currentGameState;
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
      <div className="captured-cards-positioned">
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
