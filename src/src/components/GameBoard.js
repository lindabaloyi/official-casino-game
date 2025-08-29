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
  const handleDropOnCard = useCallback((draggedItem, targetItem) => {
    if (!targetItem || !draggedItem || !draggedItem.card) {
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
      if (targetItem.type === 'build') {
        const build = targetItem;

        // Action A: CAPTURE the build
        if (rankValue(draggedCard.rank) === build.value) {
          return handleCapture(currentGameState, draggedCard, build.cards);
        }

        // If we reach here, the move is invalid. Let's provide a better reason.
        if (build.owner !== currentPlayer) {
          alert("You cannot build on an opponent's build. You can only capture it if your card's value matches the build's value.");
        } else {
          // A player cannot drop a single card from their hand onto their own build.
          // They must combine it with a loose card from the table.
          alert("Invalid move. To add to your build, drop your hand card onto a loose card on the table.");
        }
        return currentGameState;
      }

      // CASE 2: Dropped on a LOOSE CARD
      const looseCard = targetItem;
      const buildValue = rankValue(draggedCard.rank) + rankValue(looseCard.rank);
      const canBuild = playerHand.some(c => rankValue(c.rank) === buildValue && (c.rank !== draggedCard.rank || c.suit !== draggedCard.suit));
      const canCapture = rankValue(draggedCard.rank) === rankValue(looseCard.rank);

      // Action A: ADD TO an existing build.
      const existingBuild = tableCards.find(
        item => item.type === 'build' && item.owner === currentPlayer && item.value === buildValue
      );
      if (existingBuild) {
        return handleAddToBuild(currentGameState, draggedCard, looseCard, existingBuild);
      }

      // Action B: CREATE a new build.
      if (canBuild) {
        return handleBuild(currentGameState, draggedCard, [looseCard], buildValue);
      }

      // Action C: CAPTURE the loose card.
      if (canCapture) return handleCapture(currentGameState, draggedCard, [looseCard]);

      alert("Invalid move. You cannot build or capture with these cards.");
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
