import { useState, useCallback } from 'react';
import {
  initializeGame,
} from './game-logic/game-state.js';
import {
  handleBuild,
  handleCapture,
  handleTrail,
  handleBaseBuild,
  handleTemporalBuild,
} from './game-logic/index.js';
import { rankValue, findBaseBuilds, findOpponentMatchingCards, countIdenticalCardsInHand } from './game-logic/index.js';

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

      // Check if this should be a capture instead of a trail
      const matchingTableCard = currentGameState.tableCards.find(c => !c.type && c.rank === card.rank);
      if (matchingTableCard) {
        showError(`You cannot trail a ${card.rank} because one is already on the table. Try dragging onto the specific card to capture it.`);
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
        case 'enhanced_capture':
          return handleCapture(currentGameState, action.payload.draggedCard, [action.payload.targetCard], action.payload.opponentCard);
        case 'build':
          return handleBuild(
            currentGameState,
            action.payload.draggedCard,
            [action.payload.targetCard],
            action.payload.buildValue,
            action.payload.biggerCard,
            action.payload.smallerCard
          );
        case 'baseBuild':
          return handleBaseBuild(currentGameState, action.payload.draggedCard, action.payload.baseCard, action.payload.otherCardsInBuild);
        default:
          return currentGameState;
      }
    });
    setModalInfo(null);
  }, []);


  // Helper function to generate possible actions for loose card drops
  const generatePossibleActions = (draggedCard, looseCard, playerHand, tableCards, playerCaptures, currentPlayer) => {
    const actions = [];
    const remainingHand = playerHand.filter(c =>
      c.rank !== draggedCard.rank || c.suit !== draggedCard.suit
    );

    const opponentIndex = 1 - currentPlayer;
    const opponentCaptures = playerCaptures[opponentIndex] || [];

    // Count identical cards in player's hand
    const identicalCardCount = countIdenticalCardsInHand(playerHand, draggedCard);

    // Check for direct capture first (highest priority)
    if (rankValue(draggedCard.rank) === rankValue(looseCard.rank)) {
      // Strategic choice: If player has only one identical card, must capture
      if (identicalCardCount === 1) {
        actions.push(createActionOption(
          'capture',
          `Capture ${looseCard.rank}`,
          { draggedCard, targetCard: looseCard }
        ));
      } else {
        // Player has multiple identical cards - offer choice between capture and build
        actions.push(createActionOption(
          'capture',
          `Capture ${looseCard.rank}`,
          { draggedCard, targetCard: looseCard }
        ));

        // Also offer build option
        actions.push(createActionOption(
          'build',
          `Build ${rankValue(draggedCard.rank)}`,
          { draggedCard, targetCard: looseCard, buildValue: rankValue(draggedCard.rank) }
        ));

        // Check for same-value sum builds (2+2=4, 3+3=6, 4+4=8, 5+5=10)
        const cardValue = rankValue(draggedCard.rank);
        if (cardValue >= 2 && cardValue <= 5) {
          const sumBuildValue = cardValue * 2; // 2+2=4, 3+3=6, 4+4=8, 5+5=10

          // Check if player has a card to capture this sum build later
          const canCaptureSumBuild = remainingHand.some(c => rankValue(c.rank) === sumBuildValue);
          if (canCaptureSumBuild) {
            actions.push(createActionOption(
              'build',
              `Build ${sumBuildValue} (${draggedCard.rank} + ${looseCard.rank})`,
              { draggedCard, targetCard: looseCard, buildValue: sumBuildValue }
            ));
          }
        }
      }

      // Check for enhanced capture using opponent's cards
      const opponentMatchingCards = findOpponentMatchingCards(opponentCaptures, draggedCard);
      opponentMatchingCards.forEach(opponentCard => {
        actions.push(createActionOption(
          'enhanced_capture',
          `Capture ${looseCard.rank} using opponent's ${opponentCard.rank}`,
          { draggedCard, targetCard: looseCard, opponentCard }
        ));
      });
    }

    // Check for base builds (complex multi-card builds) - only if not a direct capture scenario
    if (rankValue(draggedCard.rank) !== rankValue(looseCard.rank)) {
      const baseBuildCombinations = findBaseBuilds(draggedCard, looseCard, tableCards);
      baseBuildCombinations.forEach(combination => {
        actions.push(createActionOption(
          'baseBuild',
          `Build ${rankValue(draggedCard.rank)} on ${looseCard.rank} with ${combination.map(c => c.rank).join('+')}`,
          { draggedCard, baseCard: looseCard, otherCardsInBuild: combination }
        ));
      });
    }

    // Check for sum build (different value cards that add up)
    if (rankValue(draggedCard.rank) !== rankValue(looseCard.rank)) {
      const sumBuildValue = rankValue(draggedCard.rank) + rankValue(looseCard.rank);
      if (sumBuildValue <= 10 && remainingHand.some(c => rankValue(c.rank) === sumBuildValue)) {
        // Determine stacking order: bigger card at bottom, smaller card on top
        const draggedValue = rankValue(draggedCard.rank);
        const targetValue = rankValue(looseCard.rank);
        const biggerCard = Math.max(draggedValue, targetValue) === draggedValue ? draggedCard : looseCard;
        const smallerCard = Math.max(draggedValue, targetValue) === draggedValue ? looseCard : draggedCard;

        // For display: smaller card should be LAST in array (on top)
        // biggerCard goes first (bottom), smallerCard goes last (top)

        console.log(`Build creation: dragged=${draggedCard.rank}(${draggedValue}), target=${looseCard.rank}(${targetValue})`);
        console.log(`Math.max result: ${Math.max(draggedValue, targetValue)}`);
        console.log(`Stack order: bottom=${biggerCard.rank}, top=${smallerCard.rank}`);
        console.log(`Cards being sent: bigger=${biggerCard.rank}, smaller=${smallerCard.rank}`);

        actions.push(createActionOption(
          'build',
          `Build ${sumBuildValue} (${biggerCard.rank} + ${smallerCard.rank})`,
          {
            draggedCard,
            targetCard: looseCard,
            buildValue: sumBuildValue,
            biggerCard,
            smallerCard
          }
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

    // Get fresh game state for turn validation
    setGameState(currentGameState => {
      const { currentPlayer, playerHands, tableCards } = currentGameState;
      const draggedCard = draggedItem.card;

      // Debug logging for troubleshooting
      // console.log(`Drop attempt - Dragged Player: ${draggedItem.player}, Current Player: ${currentPlayer}, Card: ${draggedCard.rank}`);

      if (draggedItem.player !== currentPlayer) {
        console.error(`Drop turn validation failed - dragged player: ${draggedItem.player}, current player: ${currentPlayer}`);
        showError("It's not your turn!");
        return currentGameState;
      }

      // Handler for dropping on a loose card
      const handleLooseCardDrop = () => {
        const playerHand = playerHands[currentPlayer];

        // Try to find target card using cardId first (more reliable), then fallback to rank/suit
        let targetCard = null;
        if (targetInfo.cardId) {
          targetCard = tableCards.find(c => !c.type && `${c.rank}-${c.suit}` === targetInfo.cardId);
        }
        if (!targetCard) {
          // Fallback to rank/suit matching
          targetCard = tableCards.find(c => !c.type && c.rank === targetInfo.rank && c.suit === targetInfo.suit);
        }

        if (!targetCard) {
          showError("Target card not found on table. The card may have already been captured.");
          return currentGameState;
        }

        const possibleActions = generatePossibleActions(draggedCard, targetCard, playerHand, tableCards, currentGameState.playerCaptures, currentPlayer);

        if (possibleActions.length === 0) {
          showError("No valid moves with this card combination.");
          return currentGameState;
        } else if (possibleActions.length === 1) {
          // Execute action immediately
          const newState = executeAction(currentGameState, possibleActions[0]);
          return newState;
        } else {
          // Show modal for user to choose
          setModalInfo({
            title: 'Choose Your Action',
            message: `What would you like to do with the ${draggedCard.rank} and ${targetCard.rank}?`,
            actions: possibleActions,
          });
          return currentGameState;
        }
      };

      // Handler for dropping on a build
      const handleBuildDrop = () => {
        const buildToDropOn = tableCards.find(b => b.type === 'build' && b.buildId === targetInfo.buildId);
        if (!buildToDropOn) {
          showError("Target build not found on table. The build may have already been captured.");
          return currentGameState;
        }

        if (rankValue(draggedCard.rank) === buildToDropOn.value) {
          const newState = handleCapture(currentGameState, draggedCard, [buildToDropOn]);
          return newState;
        } else {
          showError(`Cannot capture build of ${buildToDropOn.value} with a ${draggedCard.rank}.`);
          return currentGameState;
        }
      };

      if (targetInfo.type === 'loose') {
        return handleLooseCardDrop();
      } else if (targetInfo.type === 'build') {
        return handleBuildDrop();
      } else {
        showError("Unknown drop target type.");
        return currentGameState;
      }
    });
  }, [showError, setModalInfo]);

  // Helper function to execute actions within setGameState
  const executeAction = (currentGameState, action) => {
    switch (action.type) {
      case 'capture':
        return handleCapture(currentGameState, action.payload.draggedCard, [action.payload.targetCard]);
      case 'enhanced_capture':
        return handleCapture(currentGameState, action.payload.draggedCard, [action.payload.targetCard], action.payload.opponentCard);
      case 'build':
        return handleBuild(
          currentGameState,
          action.payload.draggedCard,
          [action.payload.targetCard],
          action.payload.buildValue,
          action.payload.biggerCard,
          action.payload.smallerCard
        );
      case 'baseBuild':
        return handleBaseBuild(currentGameState, action.payload.draggedCard, action.payload.baseCard, action.payload.otherCardsInBuild);
      default:
        return currentGameState;
    }
  };

  return { gameState, modalInfo, handleTrailCard, handleDropOnCard, handleModalAction, setModalInfo, executeAction };
};