import { useState, useCallback, useEffect } from 'react';
import {
  initializeGame,
} from './game-logic/game-state.js';
import {
  handleBuild,
  handleCapture,
  handleTrail,
  handleBaseBuild,
  handleTemporalBuild,
  handleAddToOpponentBuild,
  startNextRound,
  handleSweep,
  calculateScores,
  endGame,
} from './game-logic/index.js';
import { rankValue, findBaseBuilds, findOpponentMatchingCards, countIdenticalCardsInHand } from './game-logic/index.js';
import { validateAddToOpponentBuild, validateTrail } from './game-logic/validation.js';

// Import notification system
import { useNotifications } from './styles/NotificationSystem';

export const useGameActions = () => {
  const [gameState, setGameState] = useState(initializeGame());
  const [modalInfo, setModalInfo] = useState(null);
  const { showError, showWarning, showInfo } = useNotifications();

  // Effect to handle end of round and end of game
  useEffect(() => {
    const { playerHands, round, deck, gameOver } = gameState;

    // Don't run if game is already over
    if (gameOver) return;

    // Condition for end of a round: both hands are empty
    if (
      playerHands[0].length === 0 &&
      playerHands[1].length === 0
    ) {
      // Use a timeout to allow players to see the final board state
      const timer = setTimeout(() => {
        setGameState(currentState => {
          // Re-check to prevent race conditions
          if (currentState.gameOver || (currentState.playerHands[0].length !== 0 || currentState.playerHands[1].length !== 0)) {
            return currentState;
          }

          let sweptState = { ...currentState };
          // Step 1: Sweep remaining cards if any
          if (sweptState.tableCards.length > 0 && sweptState.lastCapturer !== null) {
            showInfo(`Player ${sweptState.lastCapturer + 1} sweeps the table.`);
            sweptState = handleSweep(sweptState);
          }

          // Step 2: Check game flow
          if (sweptState.round === 1 && sweptState.deck.length > 0) {
            showInfo("Round 1 over. Dealing for Round 2.");
            return startNextRound(sweptState);
          } else {
            showInfo("Game over! Tallying points...");
            return endGame(sweptState);
          }
        });
      }, 2000); // 2-second delay

      return () => clearTimeout(timer); // Cleanup timer on unmount or re-render
    }
  }, [gameState, showInfo]);

  const handleTrailCard = useCallback((card, player) => {
    setGameState(currentGameState => {
      if (player !== currentGameState.currentPlayer) {
        showError("It's not your turn!");
        return currentGameState;
      }

      const { tableCards, round } = currentGameState;
      const validation = validateTrail(tableCards, card, player, round);

      if (!validation.valid) {
        showError(validation.message);
        return currentGameState;
      }

      // If validation passes, execute the trail action.
      // The handleTrail function now assumes the move is valid.
      return handleTrail(currentGameState, card);
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

      const { draggedItem } = action.payload;

      switch (action.type) {
        case 'capture':
          return handleCapture(currentGameState, draggedItem, [action.payload.targetCard]);
        case 'enhanced_capture':
          return handleCapture(currentGameState, draggedItem, [action.payload.targetCard], action.payload.opponentCard);
        case 'build':
          return handleBuild(
            currentGameState,
            draggedItem,
            [action.payload.targetCard],
            action.payload.buildValue,
            action.payload.biggerCard,
            action.payload.smallerCard
          );
        case 'baseBuild':
          return handleBaseBuild(currentGameState, draggedItem, action.payload.baseCard, action.payload.otherCardsInBuild);
        case 'addToOpponentBuild':
          return handleAddToOpponentBuild(currentGameState, draggedItem, action.payload.buildToAddTo);
        default:
          return currentGameState;
      }
    });
    setModalInfo(null);
  }, []);


  // Helper function to generate possible actions for loose card drops
  const generatePossibleActions = (draggedItem, looseCard, playerHand, tableCards, playerCaptures, currentPlayer) => {
    const actions = [];
    const { card: draggedCard } = draggedItem;
    const remainingHand = playerHand.filter(c =>
      c.rank !== draggedCard.rank || c.suit !== draggedCard.suit
    );

    const opponentIndex = 1 - currentPlayer;
    const opponentCaptures = playerCaptures[opponentIndex] || [];

    // Check if player can create new builds at all
    const canPlayerCreateBuild = !tableCards.some(c => c.type === 'build' && c.owner === currentPlayer);

    // Count identical cards in player's hand
    const identicalCardCount = countIdenticalCardsInHand(playerHand, draggedCard);

    // Check for direct capture first (highest priority)
    if (rankValue(draggedCard.rank) === rankValue(looseCard.rank)) {
      // Strategic choice: If player has only one identical card, must capture
      if (identicalCardCount === 1) {
        actions.push(createActionOption(
          'capture',
          `Capture ${looseCard.rank}`,
          { draggedItem, targetCard: looseCard }
        ));
      } else {
        // Player has multiple identical cards - offer choice between capture and build
        actions.push(createActionOption(
          'capture',
          `Capture ${looseCard.rank}`,
          { draggedItem, targetCard: looseCard }
        ));

        // Also offer build option
        if (canPlayerCreateBuild) {
          actions.push(createActionOption(
            'build',
            `Build ${rankValue(draggedCard.rank)}`,
            { draggedItem, targetCard: looseCard, buildValue: rankValue(draggedCard.rank) }
          ));
        }

        // Check for same-value sum builds (2+2=4, 3+3=6, 4+4=8, 5+5=10)
        const cardValue = rankValue(draggedCard.rank);
        if (cardValue >= 2 && cardValue <= 5) {
          const sumBuildValue = cardValue * 2; // 2+2=4, 3+3=6, 4+4=8, 5+5=10

          if (canPlayerCreateBuild) {
            // Check if player has a card to capture this sum build later
            const canCaptureSumBuild = remainingHand.some(c => rankValue(c.rank) === sumBuildValue);
            if (canCaptureSumBuild) {
              actions.push(createActionOption(
                'build',
                `Build ${sumBuildValue} (${draggedCard.rank} + ${looseCard.rank})`,
                { draggedItem, targetCard: looseCard, buildValue: sumBuildValue }
              ));
            }
          }
        }
      }

      // Check for enhanced capture using opponent's cards
      const opponentMatchingCards = findOpponentMatchingCards(opponentCaptures, draggedCard);
      opponentMatchingCards.forEach(opponentCard => {
        actions.push(createActionOption(
          'enhanced_capture',
          `Capture ${looseCard.rank} using opponent's ${opponentCard.rank}`,
          { draggedItem, targetCard: looseCard, opponentCard }
        ));
      });
    }

    // Check for base builds (complex multi-card builds) - only if not a direct capture scenario
    if (canPlayerCreateBuild && rankValue(draggedCard.rank) !== rankValue(looseCard.rank)) {
      const baseBuildCombinations = findBaseBuilds(draggedCard, looseCard, tableCards);
      baseBuildCombinations.forEach(combination => {
        actions.push(createActionOption(
          'baseBuild',
          `Build ${rankValue(draggedCard.rank)} on ${looseCard.rank} with ${combination.map(c => c.rank).join('+')}`,
          { draggedItem, baseCard: looseCard, otherCardsInBuild: combination }
        ));
      });
    }

    // Check for sum build (different value cards that add up)
    if (canPlayerCreateBuild && rankValue(draggedCard.rank) !== rankValue(looseCard.rank)) {
      const sumBuildValue = rankValue(draggedCard.rank) + rankValue(looseCard.rank);      
      if (sumBuildValue <= 10 && remainingHand.some(c => rankValue(c.rank) === sumBuildValue)) {
        // Determine stacking order: bigger card at bottom, smaller card on top
        const draggedValue = rankValue(draggedCard.rank);
        const targetValue = rankValue(looseCard.rank);
        const biggerCard = Math.max(draggedValue, targetValue) === draggedValue ? draggedCard : looseCard;
        const smallerCard = Math.max(draggedValue, targetValue) === draggedValue ? looseCard : draggedCard;

        // For display: smaller card should be LAST in array (on top)
        // biggerCard goes first (bottom), smallerCard goes last (top)

        actions.push(createActionOption(
          'build',
          `Build ${sumBuildValue} (${biggerCard.rank} + ${smallerCard.rank})`,
          {
            draggedItem,
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

        const possibleActions = generatePossibleActions(draggedItem, targetCard, playerHand, tableCards, currentGameState.playerCaptures, currentPlayer);

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
            message: `What would you like to do with the ${draggedItem.card.rank} and ${targetCard.rank}?`,
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

        const playerHand = playerHands[currentPlayer];
        const { card: draggedCard } = draggedItem;

        // Case 1: Direct Capture
        if (rankValue(draggedCard.rank) === buildToDropOn.value) {
          return handleCapture(currentGameState, draggedItem, [buildToDropOn]);
        }

        // Case 2: Interacting with an opponent's build
        if (buildToDropOn.owner !== currentPlayer) {
          const validation = validateAddToOpponentBuild(buildToDropOn, draggedCard, playerHand, tableCards, currentPlayer);
          if (validation.valid) {
            return handleAddToOpponentBuild(currentGameState, draggedItem, buildToDropOn);
          } else {
            showError(validation.message);
            return currentGameState;
          }
        }

        // Case 3: Interacting with your own build (placeholder for future)
        if (buildToDropOn.owner === currentPlayer) {
          showError("You cannot add this card to your own build yet.");
          return currentGameState;
        }

        showError(`Invalid move on build of ${buildToDropOn.value}.`);
        return currentGameState;
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
  }, [showError, setModalInfo, handleModalAction]);

  // Helper function to execute actions within setGameState
  const executeAction = (currentGameState, action) => {
    const { draggedItem } = action.payload;
    switch (action.type) {
      case 'capture':
        return handleCapture(currentGameState, draggedItem, [action.payload.targetCard]);
      case 'enhanced_capture':
        return handleCapture(currentGameState, draggedItem, [action.payload.targetCard], action.payload.opponentCard);
      case 'build':
        return handleBuild(
          currentGameState,
          draggedItem,
          [action.payload.targetCard],
          action.payload.buildValue,
          action.payload.biggerCard,
          action.payload.smallerCard
        );
      case 'baseBuild':
        return handleBaseBuild(currentGameState, draggedItem, action.payload.baseCard, action.payload.otherCardsInBuild);
      case 'addToOpponentBuild':
        return handleAddToOpponentBuild(currentGameState, draggedItem, action.payload.buildToAddTo);
      default:
        return currentGameState;
    }
  };

  return { gameState, modalInfo, handleTrailCard, handleDropOnCard, handleModalAction, setModalInfo, executeAction };
};