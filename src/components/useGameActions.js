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
  handleAddToOwnBuild,
  handleCreateBuildFromStack,
} from './game-logic/index.js';
import { rankValue, findBaseBuilds, findOpponentMatchingCards, countIdenticalCardsInHand, getCardId, calculateCardSum, canPartitionIntoSums } from './game-logic/index.js';
import { validateAddToOpponentBuild, validateTrail, validateAddToOwnBuild, validateTemporaryStackBuild } from './game-logic/validation.js';

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
        case 'addToOwnBuild':
          return handleAddToOwnBuild(currentGameState, draggedItem, action.payload.buildToAddTo);
        case 'createBuildFromStack':
          return handleCreateBuildFromStack(currentGameState, draggedItem, action.payload.stackToBuildFrom);
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
        if (cardValue >= 1 && cardValue <= 5) {
          const sumBuildValue = cardValue * 2; // 2+2=4, 3+3=6, 4+4=8, 5+5=10

          if (canPlayerCreateBuild) {
            // Check if player has a card to capture this sum build later
            const canCaptureSumBuild = remainingHand.some(c => rankValue(c.rank) === sumBuildValue);
            if (canCaptureSumBuild) {
              actions.push(createActionOption(
                'build', `Build ${sumBuildValue}`,
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
          `Build ${sumBuildValue}`,
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
      const { currentPlayer, playerHands, tableCards, playerCaptures } = currentGameState;
      const { card: draggedCard, source: draggedSource } = draggedItem;

      // Debug logging for troubleshooting

      if (draggedItem.player !== currentPlayer) {
        console.error(`Drop turn validation failed - dragged player: ${draggedItem.player}, current player: ${currentPlayer}`);
        showError("It's not your turn!");
        return currentGameState;
      }

      // --- NEW LOGIC FOR TEMPORARY CAPTURE STACKS ---

      // Case A: A card is being used to create/add to a temporary stack
      // This can be a card from the table OR the opponent's capture pile.
      if (draggedSource === 'table' || draggedSource === 'opponentCapture') {
        let newTableCards = tableCards;
        let newPlayerCaptures = playerCaptures;
        let cardRemoved = false;

        // Step 1: Remove the dragged card from its source
        if (draggedSource === 'opponentCapture') {
          const opponentIndex = 1 - currentPlayer;
          const opponentCaps = [...playerCaptures[opponentIndex]];
          if (opponentCaps.length > 0) {
            const lastGroup = [...opponentCaps[opponentCaps.length - 1]];
            if (lastGroup.length > 0) {
              lastGroup.pop(); // Remove the top card
              if (lastGroup.length > 0) {
                opponentCaps[opponentCaps.length - 1] = lastGroup;
              } else {
                opponentCaps.pop(); // Remove empty group
              }
              const updatedCaptures = [...playerCaptures];
              updatedCaptures[opponentIndex] = opponentCaps;
              newPlayerCaptures = updatedCaptures;
              cardRemoved = true;
            }
          }
        } else { // source is 'table'
          const originalLength = tableCards.length;
          newTableCards = tableCards.filter(c => getCardId(c) !== getCardId(draggedCard));
          cardRemoved = newTableCards.length < originalLength;
        }

        if (!cardRemoved) {
          showError("Could not find the dragged card's source to move it.");
          return currentGameState;
        }

        // Step 2: Add the card to the target on the table
        // A.1: Dropped on a loose card to create a new stack
        if (targetInfo.type === 'loose') {
          const targetCard = tableCards.find(c => !c.type && getCardId(c) === targetInfo.cardId);
          if (!targetCard) { showError("Target card for stack not found."); return currentGameState; }
          if (getCardId(draggedCard) === getCardId(targetCard)) return currentGameState; // Prevent self-drop

          const newStack = {
            stackId: `temp-${Date.now()}`,
            type: 'temporary_stack',
            cards: [targetCard, draggedCard], // Base card first
            owner: currentPlayer,
          };
          const finalTableCards = newTableCards.filter(c => getCardId(c) !== getCardId(targetCard));
          finalTableCards.push(newStack);
          return { ...currentGameState, tableCards: finalTableCards, playerCaptures: newPlayerCaptures };
        }
        // A.2: Dropped on an existing temporary stack to add to it
        if (targetInfo.type === 'temporary_stack') {
          const targetStack = tableCards.find(s => s.type === 'temporary_stack' && s.stackId === targetInfo.stackId);
          if (!targetStack) { showError("Target stack not found."); return currentGameState; }
          if (targetStack.owner !== currentPlayer) { showError("You cannot add to another player's temporary stack."); return currentGameState; }

          const newStack = { ...targetStack, cards: [...targetStack.cards, draggedCard] };
          const finalTableCards = newTableCards.filter(c => c.stackId !== targetStack.stackId);
          finalTableCards.push(newStack);
          return { ...currentGameState, tableCards: finalTableCards, playerCaptures: newPlayerCaptures };
        }
        showError("Invalid move: Cards can only be stacked on loose cards or other temporary stacks.");
        return currentGameState;
      }

      // Case B: A hand card is being dragged
      if (draggedSource === 'hand') {
        // B.1: Dropped on a temporary stack
        if (targetInfo.type === 'temporary_stack') {
          const stack = tableCards.find(s => s.type === 'temporary_stack' && s.stackId === targetInfo.stackId);
          if (!stack) { showError("Stack not found."); return currentGameState; }
          if (stack.owner !== currentPlayer) { showError("You can only interact with your own temporary stacks."); return currentGameState; }

          const actions = [];
          const playerHand = playerHands[currentPlayer];

          // --- Possibility 1: Capture ---
          const sumOfStack = calculateCardSum(stack.cards);
          const captureValue = rankValue(draggedCard.rank);

          if (sumOfStack % captureValue === 0) {
            if (sumOfStack === captureValue || canPartitionIntoSums(stack.cards, captureValue)) {
              actions.push(createActionOption('capture', `Capture for ${captureValue}`, { draggedItem, targetCard: stack }));
            }
          }

          // --- Possibility 2: Create a permanent build ---
          const buildValidation = validateTemporaryStackBuild(stack, draggedCard, playerHand, tableCards, currentPlayer);
          if (buildValidation.valid) {
            actions.push(createActionOption('createBuildFromStack', `Build ${buildValidation.newValue}`, { draggedItem, stackToBuildFrom: stack }));
          }

          // --- Decision Logic ---
          if (actions.length === 0) {
            showError(`Invalid move. Cannot capture or build with this combination.`);
            // Disband the stack
            const newTableCards = tableCards.filter(s => s.stackId !== stack.stackId);
            newTableCards.push(...stack.cards);
            return { ...currentGameState, tableCards: newTableCards };
          } else if (actions.length === 1) {
            return executeAction(currentGameState, actions[0]);
          } else {
            setModalInfo({ title: 'Choose Your Action', message: `What would you like to do with this stack?`, actions: actions });
            return currentGameState;
          }
        }
        // B.2 & B.3 (Hand on loose card or build) fall through to the existing logic below.
      }

      // --- END NEW LOGIC ---

      // Handler for dropping on a loose card
      const handleLooseCardDrop = () => {
        const playerHand = playerHands[currentPlayer];

        // Try to find target card using cardId first (more reliable), then fallback to rank/suit
        let targetCard = null;
        if (targetInfo.cardId) {
          targetCard = tableCards.find(c => !c.type && getCardId(c) === targetInfo.cardId);
        }
        if (!targetCard) {
          // Fallback to rank/suit matching
          targetCard = tableCards.find(c => !c.type && c.rank === targetInfo.rank && c.suit === targetInfo.suit);
        }

        if (!targetCard) {
          showError("Target card not found on table. The card may have already been captured.");
          return currentGameState;
        }

        const possibleActions = generatePossibleActions(draggedItem, targetCard, playerHand, tableCards, playerCaptures, currentPlayer);

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
        const actions = [];

        // Possibility 1: Capture the build
        if (rankValue(draggedCard.rank) === buildToDropOn.value) {
          actions.push(createActionOption(
            'capture', `Capture Build (${buildToDropOn.value})`,
            { draggedItem, targetCard: buildToDropOn }
          ));
        }

        // Possibility 2: Extend an opponent's build
        if (buildToDropOn.owner !== currentPlayer) {
          const validation = validateAddToOpponentBuild(buildToDropOn, draggedCard, playerHand, tableCards, currentPlayer);
          if (validation.valid) {
            const newBuildValue = buildToDropOn.value + rankValue(draggedCard.rank);
            actions.push(createActionOption(
              'addToOpponentBuild', `Extend to ${newBuildValue}`,
              { draggedItem, buildToAddTo: buildToDropOn }
            ));
          }
        }

        // Possibility 3: Add to your own build
        if (buildToDropOn.owner === currentPlayer) {
          const validation = validateAddToOwnBuild(buildToDropOn, draggedCard, playerHand);
          if (validation.valid) {
            actions.push(createActionOption(
              'addToOwnBuild', `Add to Build (${validation.newValue})`,
              { draggedItem, buildToAddTo: buildToDropOn }
            ));
          }
        }

        // --- Decision Logic ---
        if (actions.length === 0) {
          if (buildToDropOn.owner === currentPlayer) {
            showError("You cannot add this card to your own build.");
          } else {
            const validation = validateAddToOpponentBuild(buildToDropOn, draggedCard, playerHand, tableCards, currentPlayer);
            showError(validation.message || `Invalid move on build of ${buildToDropOn.value}.`);
          }
          return currentGameState;
        } else if (actions.length === 1) {
          return executeAction(currentGameState, actions[0]);
        } else {
          setModalInfo({
            title: 'Choose Your Action',
            message: `What would you like to do with your ${draggedCard.rank}?`,
            actions: actions,
          });
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
      case 'addToOwnBuild':
        return handleAddToOwnBuild(currentGameState, draggedItem, action.payload.buildToAddTo);
      case 'createBuildFromStack':
        return handleCreateBuildFromStack(currentGameState, draggedItem, action.payload.stackToBuildFrom);
      default:
        return currentGameState;
    }
  };

  return { gameState, modalInfo, handleTrailCard, handleDropOnCard, handleModalAction, setModalInfo, executeAction };
};