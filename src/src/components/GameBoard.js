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
          return handleCapture(currentGameState, draggedCard, [build]);
        }

        // If capture is not possible, the move is invalid. Provide a clear, direct reason.
        alert(`Cannot use a ${draggedCard.rank} to capture a build of ${build.value}. The values must match.`);
        return currentGameState;
      }

      // CASE 2: Dropped on a LOOSE CARD
      if (targetInfo.type === 'loose') {
        const looseCard = tableCards.find(c => !c.type && c.rank === targetInfo.rank && c.suit === targetInfo.suit);
        if (!looseCard) return currentGameState;

        const potentialBuildValue = rankValue(draggedCard.rank) + rankValue(looseCard.rank);

        // HIERARCHY CHECK 1: Does the player already own a build? This drastically changes their legal moves.
        const existingBuild = tableCards.find(item => item.type === 'build' && item.owner === currentPlayer);

        if (existingBuild) {
          // A player with a build has limited options. They can either add to it or make a simple capture.

          // Option A: MUST they add to their build?
          if (potentialBuildValue === existingBuild.value) {
            return handleAddToBuild(currentGameState, draggedCard, looseCard, existingBuild);
          }
          // Option B: Are they making a simple capture?
          else if (rankValue(draggedCard.rank) === rankValue(looseCard.rank)) {
            return handleCapture(currentGameState, draggedCard, [looseCard]);
          }
          else {
            alert(`Invalid move. You cannot create a new build while you already own one.`);
            return currentGameState; // Any other move is illegal.
          }
        }

        // If we reach here, the player does NOT own a build. They are free to create one.

        // HIERARCHY CHECK 2: Is this an ambiguous same-rank play?
        const isSameRankPlay = rankValue(draggedCard.rank) === rankValue(looseCard.rank);
        if (isSameRankPlay) {
          const remainingHand = playerHand.filter(c => c.rank !== draggedCard.rank || c.suit !== draggedCard.suit);
          const possibleActions = [];
          possibleActions.push({ type: 'capture', label: `Capture ${looseCard.rank}` });

          const setBuildValue = rankValue(draggedCard.rank);
          if (remainingHand.some(c => rankValue(c.rank) === setBuildValue)) {
            possibleActions.push({ type: 'build', label: `Build ${setBuildValue}`, buildValue: setBuildValue });
          }
          if (potentialBuildValue <= 10 && remainingHand.some(c => rankValue(c.rank) === potentialBuildValue)) {
            possibleActions.push({ type: 'build', label: `Build ${potentialBuildValue}`, buildValue: potentialBuildValue });
          }

          if (possibleActions.length > 1) {
            const promptMessage = `Choose an action:\n${possibleActions.map((a, i) => `${i + 1}: ${a.label}`).join('\n')}`;
            const choice = window.prompt(promptMessage, '1');
            const choiceIndex = parseInt(choice, 10) - 1;
            if (choiceIndex >= 0 && choiceIndex < possibleActions.length) {
              const selectedAction = possibleActions[choiceIndex];
              return selectedAction.type === 'capture' ? handleCapture(currentGameState, draggedCard, [looseCard]) : handleBuild(currentGameState, draggedCard, [looseCard], selectedAction.buildValue);
            }
            return currentGameState; // Invalid or cancelled prompt
          } else {
            // Only one action is possible (forced capture), so execute it automatically.
            return handleCapture(currentGameState, draggedCard, [looseCard]);
          }
        }

        // HIERARCHY CHECK 3: If not adding to a build and not a same-rank play,
        const canBuild = playerHand.some(c => rankValue(c.rank) === potentialBuildValue && (c.rank !== draggedCard.rank || c.suit !== draggedCard.suit));
        if (canBuild && potentialBuildValue <= 10) {
          return handleBuild(currentGameState, draggedCard, [looseCard], potentialBuildValue);
        }

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
