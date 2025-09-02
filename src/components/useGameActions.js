import { useState, useCallback } from 'react';
import {
  initializeGame,
  handleBuild,
  handleCapture,
  handleTrail,
  rankValue,
  findBaseBuilds,
  handleBaseBuild,
} from './game-logic';

export const useGameActions = () => {
  const [gameState, setGameState] = useState(initializeGame());
  const [modalInfo, setModalInfo] = useState(null);

  const handleTrailCard = useCallback((card, player) => {
    setGameState(currentGameState => {
      if (player !== currentGameState.currentPlayer) {
        alert("It's not your turn!");
        return currentGameState;
      }
      return handleTrail(currentGameState, card);
    });
  }, []);

  const handleModalAction = useCallback((action) => {
    setGameState(currentGameState => {
      if (!action || !action.payload) return currentGameState;
      const { draggedCard, targetCard } = action.payload;
      if (action.type === 'capture') {
        return handleCapture(currentGameState, draggedCard, [targetCard]);
      } else if (action.type === 'build') {
        return handleBuild(currentGameState, action.payload.draggedCard, [[action.payload.targetCard]], action.buildValue);
      } else if (action.type === 'baseBuild') {
        return handleBaseBuild(currentGameState, action.payload.draggedCard, action.payload.baseCard, action.payload.otherCardsInBuild);
      }
      return currentGameState;
    });
    setModalInfo(null);
  }, []);

  const handleDropOnCard = useCallback((draggedItem, targetInfo) => {
    if (!targetInfo || !draggedItem || !draggedItem.card) {
      console.warn("Drop on card stack was ambiguous, no action taken.");
      return;
    }

    setGameState(currentGameState => {
      const { currentPlayer, playerHands, tableCards } = currentGameState;
      const playerHand = playerHands[currentPlayer];
      const draggedCard = draggedItem.card;

      if (draggedItem.player !== currentPlayer) {
        alert("It's not your turn!");
        return currentGameState;
      }

      if (targetInfo.type === 'build') {
        const build = tableCards.find(c => c.buildId === targetInfo.buildId);
        if (!build) return currentGameState;

        if (rankValue(draggedCard.rank) === build.value) {
          return handleCapture(currentGameState, draggedCard, [build]);
        }

        alert(`Cannot use a ${draggedCard.rank} to capture a build of ${build.value}. The values must match.`);
        return currentGameState;
      }

      if (targetInfo.type === 'loose') {
        const looseCard = tableCards.find(c => !c.type && c.rank === targetInfo.rank && c.suit === targetInfo.suit);
        if (!looseCard) return currentGameState;

        if (rankValue(draggedCard.rank) === rankValue(looseCard.rank)) {
          const remainingHand = playerHand.filter(c => c.rank !== draggedCard.rank || c.suit !== draggedCard.suit);
          const possibleActions = [];

          // Check for base builds
          const baseBuildCombinations = findBaseBuilds(draggedCard, looseCard, tableCards);
          if (baseBuildCombinations.length > 0) {
            for (const combination of baseBuildCombinations) {
              possibleActions.push({
                type: 'baseBuild',
                label: `Build ${rankValue(draggedCard.rank)} on ${looseCard.rank} with ${combination.map(c => c.rank).join('+')}`,
                payload: { draggedCard, baseCard: looseCard, otherCardsInBuild: combination },
              });
            }
          }

          // Existing capture and regular build logic (only if no base builds or if we want to offer alternatives)
          if (possibleActions.length === 0) {
            possibleActions.push({ type: 'capture', label: `Capture ${looseCard.rank}`, payload: { draggedCard, targetCard: looseCard } });

            const setBuildValue = rankValue(draggedCard.rank);
            if (remainingHand.some(c => rankValue(c.rank) === setBuildValue)) {
              possibleActions.push({ type: 'build', label: `Build ${setBuildValue}`, buildValue: setBuildValue, payload: { draggedCard, targetCard: looseCard } });
            }

            const sumBuildValue = rankValue(draggedCard.rank) + rankValue(looseCard.rank);
            if (sumBuildValue <= 10 && remainingHand.some(c => rankValue(c.rank) === sumBuildValue)) {
              possibleActions.push({ type: 'build', label: `Build ${sumBuildValue}`, buildValue: sumBuildValue, payload: { draggedCard, targetCard: looseCard } });
            }
          }

          if (possibleActions.length > 1) {
            setModalInfo({ title: 'Choose Your Action', message: `You played a ${draggedCard.rank} on a ${looseCard.rank}. What would you like to do?`, actions: possibleActions });
            return currentGameState;
          } else if (possibleActions.length === 1) {
            // If only one action, execute it directly
            const action = possibleActions[0];
            if (action.type === 'capture') {
              return handleCapture(currentGameState, action.payload.draggedCard, [action.payload.targetCard]);
            } else if (action.type === 'build') {
              return handleBuild(currentGameState, action.payload.draggedCard, [[action.payload.targetCard]], action.buildValue);
            } else if (action.type === 'baseBuild') {
              return handleBaseBuild(currentGameState, action.payload.draggedCard, action.payload.baseCard, action.payload.otherCardsInBuild);
            }
          } else {
            alert("Invalid move. No valid actions found.");
            return currentGameState;
          }
        }

        // Calculate build value as sum of ALL cards in the build
        const buildValue = rankValue(draggedCard.rank) + rankValue(looseCard.rank);
        const canCreateBuild = playerHand.some(c =>
          rankValue(c.rank) === buildValue &&
          (c.rank !== draggedCard.rank || c.suit !== draggedCard.suit)
        );

        if (canCreateBuild && buildValue <= 10) {
          return handleBuild(currentGameState, draggedCard, [looseCard], buildValue);
        }

        alert("Invalid move. You cannot build or capture with these cards.");
        return currentGameState;
      }

      return currentGameState;
    });
  }, [setModalInfo]);

  return { gameState, modalInfo, handleTrailCard, handleDropOnCard, handleModalAction, setModalInfo };
};