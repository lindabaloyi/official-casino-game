import { useState, useCallback } from 'react';
import {
  initializeGame,
} from './game-logic/game-state.js';
import {
  handleBuild,
  handleCapture,
  handleTrail,
  handleBaseBuild,
} from './game-logic/index.js';
import { rankValue, findBaseBuilds } from './game-logic/index.js';

// Import notification system
import { useNotifications } from './styles/NotificationSystem';

export const useGameActions = () => {
  const [gameState, setGameState] = useState(initializeGame());
  const [modalInfo, setModalInfo] = useState(null);
  const { showError, showWarning, showInfo } = useNotifications();

  const handleTrailCard = useCallback((card, player) => {
    setGameState(currentGameState => {
      if (player !== currentGameState.currentPlayer) {
        showError("It's not your turn!");
        return currentGameState;
      }

      const newState = handleTrail(currentGameState, card);

      // If the state didn't change, it means the trail was invalid
      if (newState === currentGameState) {
        showError("Cannot trail this card. Check game rules.");
      }

      return newState;
    });
  }, [showError, handleTrail]);

  // Helper function to create action options for modal
  const createActionOption = (type, label, payload) => ({
    type,
    label,
    payload
  });

  // Helper function to check if player can create a build
  const canCreateBuild = (playerHand, draggedCard, buildValue) => {
    return playerHand.some(c =>
      rankValue(c.rank) === buildValue &&
      (c.rank !== draggedCard.rank || c.suit !== draggedCard.suit)
    );
  };

  const handleModalAction = useCallback((action) => {
    setGameState(currentGameState => {
      if (!action || !action.payload) return currentGameState;

      switch (action.type) {
        case 'capture':
          return handleCapture(currentGameState, action.payload.draggedCard, [action.payload.targetCard]);
        case 'build':
          return handleBuild(currentGameState, action.payload.draggedCard, [action.payload.targetCard], action.buildValue);
        case 'baseBuild':
          return handleBaseBuild(currentGameState, action.payload.draggedCard, action.payload.baseCard, action.payload.otherCardsInBuild);
        default:
          return currentGameState;
      }
    });
    setModalInfo(null);
  }, []);


  // Helper function to generate possible actions for loose card drops
  const generatePossibleActions = (draggedCard, looseCard, playerHand, tableCards) => {
    const actions = [];
    const remainingHand = playerHand.filter(c =>
      c.rank !== draggedCard.rank || c.suit !== draggedCard.suit
    );

    // Check for base builds
    const baseBuildCombinations = findBaseBuilds(draggedCard, looseCard, tableCards);
    baseBuildCombinations.forEach(combination => {
      actions.push(createActionOption(
        'baseBuild',
        `Build ${rankValue(draggedCard.rank)} on ${looseCard.rank} with ${combination.map(c => c.rank).join('+')}`,
        { draggedCard, baseCard: looseCard, otherCardsInBuild: combination }
      ));
    });

    // Add basic capture and build options if no base builds
    if (actions.length === 0) {
      // Check for simple capture
      if (rankValue(draggedCard.rank) === rankValue(looseCard.rank)) {
        actions.push(createActionOption(
          'capture',
          `Capture ${looseCard.rank}`,
          { draggedCard, targetCard: looseCard }
        ));
      }

      // Check for set build
      const setBuildValue = rankValue(draggedCard.rank);
      if (remainingHand.some(c => rankValue(c.rank) === setBuildValue)) {
        actions.push(createActionOption(
          'build',
          `Build ${setBuildValue}`,
          { draggedCard, targetCard: looseCard, buildValue: setBuildValue }
        ));
      }

      // Check for sum build
      const sumBuildValue = rankValue(draggedCard.rank) + rankValue(looseCard.rank);
      if (sumBuildValue <= 10 && remainingHand.some(c => rankValue(c.rank) === sumBuildValue)) {
        actions.push(createActionOption(
          'build',
          `Build ${sumBuildValue}`,
          { draggedCard, targetCard: looseCard, buildValue: sumBuildValue }
        ));
      }
    }

    return actions;
  };

  const handleDropOnCard = useCallback((draggedItem, targetInfo) => {
    if (!targetInfo || !draggedItem || !draggedItem.card) {
      console.warn("Drop on card stack was ambiguous, no action taken.");
      return;
    }

    const { currentPlayer, playerHands, tableCards } = gameState;
    const draggedCard = draggedItem.card;

    if (draggedItem.player !== currentPlayer) {
      showError("It's not your turn!");
      return;
    }

    // Handler for dropping on a loose card
    const handleLooseCardDrop = () => {
      const playerHand = playerHands[currentPlayer];
      const targetCard = tableCards.find(c => !c.type && c.rank === targetInfo.rank && c.suit === targetInfo.suit);

      if (!targetCard) {
        showError("Target card not found on table.");
        return;
      }

      const possibleActions = generatePossibleActions(draggedCard, targetCard, playerHand, tableCards);

      if (possibleActions.length === 0) {
        showError("No valid moves with this card combination.");
      } else if (possibleActions.length === 1) {
        handleModalAction(possibleActions[0]);
      } else {
        setModalInfo({
          title: 'Choose Your Action',
          message: `What would you like to do with the ${draggedCard.rank} and ${targetCard.rank}?`,
          actions: possibleActions,
        });
      }
    };

    // Handler for dropping on a build
    const handleBuildDrop = () => {
      // For now, assume dropping on a build is always a capture attempt.
      // More complex logic for "add to build" would go here.
      const buildToDropOn = tableCards.find(b => b.type === 'build' && b.buildId === targetInfo.buildId);
      if (buildToDropOn && rankValue(draggedCard.rank) === buildToDropOn.value) {
        handleModalAction({ type: 'capture', payload: { draggedCard, targetCard: buildToDropOn } });
      } else {
        showError(`Cannot capture build of ${buildToDropOn.value} with a ${draggedCard.rank}.`);
      }
    };

    if (targetInfo.type === 'loose') handleLooseCardDrop();
    else if (targetInfo.type === 'build') handleBuildDrop();
    else showError("Unknown drop target type.");

  }, [gameState, handleModalAction, setModalInfo, showError]);

  return { gameState, modalInfo, handleTrailCard, handleDropOnCard, handleModalAction, setModalInfo };
};