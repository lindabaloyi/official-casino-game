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
  handleCreateStagingStack,
  handleReinforceBuildWithStack,
  handleAddToStagingStack,
  handleDisbandStagingStack,
  handleCancelStagingStack,
  handleMergeIntoOwnBuild,
  handleStageOpponentCard,
  handleExtendToMerge,
  handleReinforceOpponentBuildWithStack,
  handleFinalizeStagingStack
} from './game-logic/index.js';
import { rankValue, findBaseBuilds, findOpponentMatchingCards, countIdenticalCardsInHand, getCardId, calculateCardSum, canPartitionIntoSums } from './game-logic/index.js';
import { validateAddToOpponentBuild, validateTrail, validateAddToOwnBuild, validateTemporaryStackBuild, validateReinforceBuildWithStack, validateMergeIntoOwnBuild, validateExtendToMerge, validateFinalizeStagingStack, validateReinforceOpponentBuildWithStack } from './game-logic/validation.js';

// Import notification system
import { useNotifications } from './styles/NotificationSystem';

export const useGameActions = () => {
  const [gameState, setGameState] = useState(initializeGame());
  const [modalInfo, setModalInfo] = useState(null);
  const { showError, showWarning, showInfo } = useNotifications();

  // Effect to handle end of round and end of game
  useEffect(() => {
    const { playerHands, deck, gameOver, round } = gameState;

    // Don't run if game is already over
    if (gameOver) return;

    // Condition for end of a round: both hands are empty
    if (playerHands[0].length === 0 && playerHands[1].length === 0) {
      // Use a timeout to allow players to see the final board state
      const timer = setTimeout(() => {
        setGameState(currentState => {
          // Re-check to prevent race conditions
          if (currentState.gameOver || (currentState.playerHands[0].length !== 0 || currentState.playerHands[1].length !== 0)
          ) {
            return currentState;
          }

          // After round 1, start round 2
          if (currentState.round === 1) {
            showInfo("Round 1 over. Starting Round 2!");
            return startNextRound(currentState);
          }
          // After round 2, end the game
          else if (currentState.round === 2) {
            let finalState = { ...currentState };
            // Sweep remaining cards if any
            if (finalState.tableCards.length > 0 && finalState.lastCapturer !== null) {
              showInfo(`Player ${finalState.lastCapturer + 1} sweeps the table.`);
              finalState = handleSweep(finalState);
            }
            showInfo("Game over! Tallying points...");
            return endGame(finalState);
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
        case 'extendToMerge':
          return handleExtendToMerge(currentGameState, draggedItem.card, action.payload.opponentBuild, action.payload.ownBuild);
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

    const canPlayerCreateBuild = !tableCards.some(c => c.type === 'build' && c.owner === currentPlayer);

    // --- Possibility 1: Capture ---
    if (rankValue(draggedCard.rank) === rankValue(looseCard.rank)) {
      actions.push(createActionOption(
        'capture',
        `Capture ${looseCard.rank}`,
        { draggedItem, targetCard: looseCard }
      ));
    }

    // --- Possibility 2: Same-Value Build ---
    if (canPlayerCreateBuild && rankValue(draggedCard.rank) === rankValue(looseCard.rank)) {
      // To create a same-value build, you must have another card of the same rank in your hand to capture it.
      const canCaptureBuild = remainingHand.some(c => rankValue(c.rank) === rankValue(draggedCard.rank));
      if (canCaptureBuild) {
        actions.push(createActionOption(
          'build',
          `Build ${rankValue(draggedCard.rank)}`,
          { draggedItem, targetCard: looseCard, buildValue: rankValue(draggedCard.rank) }
        ));
      }
    }

    // --- Possibility 3: Sum Build ---
    if (canPlayerCreateBuild) {
      const sumBuildValue = rankValue(draggedCard.rank) + rankValue(looseCard.rank);
      if (sumBuildValue <= 10) {
        // To create a sum build, you must have a card in hand matching the sum.
        const canCaptureSumBuild = remainingHand.some(c => rankValue(c.rank) === sumBuildValue);
        if (canCaptureSumBuild) {
          const biggerCard = rankValue(draggedCard.rank) > rankValue(looseCard.rank) ? draggedCard : looseCard;
          const smallerCard = rankValue(draggedCard.rank) > rankValue(looseCard.rank) ? looseCard : draggedCard;
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
    }

    // --- Possibility 4: Base Builds (if applicable) ---
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

    // --- Possibility 5: Enhanced Capture (using opponent's cards) ---
    if (rankValue(draggedCard.rank) === rankValue(looseCard.rank)) {
      const opponentMatchingCards = findOpponentMatchingCards(opponentCaptures, draggedCard);
      opponentMatchingCards.forEach(opponentCard => {
        actions.push(createActionOption(
          'enhanced_capture',
          `Capture ${looseCard.rank} using opponent's ${opponentCard.rank}`,
          { draggedItem, targetCard: looseCard, opponentCard }
        ));
      });
    }

    return actions;
  };

  const handleDropOnCard = useCallback((draggedItem, targetInfo) => {
    if (!targetInfo || !draggedItem) {
      console.warn("Drop action is missing target or dragged item information.");
      return;
    }
    // This check is now more robust. It allows items that are either a single card OR a stack.
    if (!draggedItem.card && !draggedItem.stack) {
      console.warn("Drop on card stack was ambiguous, no action taken. Dragged item is missing 'card' or 'stack' property.", draggedItem);
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

          // --- NEW VALIDATION: Enforce one temp stack at a time ---
          const playerAlreadyHasTempStack = tableCards.some(
            s => s.type === 'temporary_stack' && s.owner === currentPlayer
          );
          if (playerAlreadyHasTempStack) {
            showError("You can only have one staging stack at a time. Try adding to your existing stack.");
            return currentGameState;
          }

          // Find original index of the target card to preserve position
          const targetIndex = tableCards.findIndex(c => getCardId(c) === getCardId(targetCard));

          // Annotate cards with their source and sort them for consistent display
          const annotatedTarget = { ...targetCard, source: 'table' };
          const annotatedDragged = { ...draggedCard, source: draggedSource };

          const orderedCards = rankValue(annotatedDragged.rank) > rankValue(annotatedTarget.rank)
            ? [annotatedDragged, annotatedTarget]
            : [annotatedTarget, annotatedDragged];

          const newStack = {
            stackId: `temp-${Date.now()}`,
            type: 'temporary_stack',
            cards: orderedCards,
            owner: currentPlayer,
          };

          // Replace the target card with the new stack in the array that already had the dragged card removed.
          const finalTableCards = [...newTableCards];
          const insertionIndex = finalTableCards.findIndex(c => getCardId(c) === getCardId(targetCard));
          if (insertionIndex !== -1) {
            finalTableCards.splice(insertionIndex, 1, newStack);
          } else {
            finalTableCards.push(newStack); // Fallback
          }
          return { ...currentGameState, tableCards: finalTableCards, playerCaptures: newPlayerCaptures };
        }
        // A.2: Dropped on an existing temporary stack to add to it
        if (targetInfo.type === 'temporary_stack') {
          const targetStack = tableCards.find(s => s.type === 'temporary_stack' && s.stackId === targetInfo.stackId);
          if (!targetStack) { showError("Target stack not found."); return currentGameState; }
          if (targetStack.owner !== currentPlayer) { showError("You cannot add to another player's temporary stack."); return currentGameState; }

          const stackIndex = newTableCards.findIndex(s => s.stackId === targetStack.stackId);
          const newStack = { ...targetStack, cards: [...targetStack.cards, { ...draggedCard, source: draggedSource }] };
          const finalTableCards = [...newTableCards];
          if (stackIndex !== -1) {
            finalTableCards[stackIndex] = newStack;
          } else {
            // Fallback
            finalTableCards.push(newStack);
          }
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
            // If no final move is possible, assume the player wants to add the card to the stack.
            
            // --- NEW VALIDATION: Enforce one hand card per stack ---
            const hasHandCard = stack.cards.some(c => c.source === 'hand');
            if (hasHandCard) {
              showError("You can only use one card from your hand in a staging stack.");
              return currentGameState; // Abort the move
            }

            return handleAddToStagingStack(currentGameState, draggedCard, stack);
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
          // --- NEW: CONTEXTUAL STAGING LOGIC ---
          // If no direct actions are possible, check if we should create a staging stack.
          const playerOwnsBuild = tableCards.find(c => c.type === 'build' && c.owner === currentPlayer);
          if (playerOwnsBuild && draggedItem.source === 'hand') {
            // --- NEW VALIDATION: Enforce one temp stack at a time ---
            const playerAlreadyHasTempStack = tableCards.some(
              s => s.type === 'temporary_stack' && s.owner === currentPlayer
            );
            if (playerAlreadyHasTempStack) {
              showError("You can only have one staging stack at a time. Try adding to your existing stack.");
              return currentGameState;
            }
            // The player has a build and is trying to combine their hand card with a table card.
            // Assume they are starting a staging stack.
            const { card: draggedCard } = draggedItem;
            return handleCreateStagingStack(currentGameState, draggedCard, targetCard);
          }
          // --- END NEW LOGIC ---

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

        // --- Handle dropping a temporary stack onto a build ---
        if (draggedItem.source === 'temp_stack') {
          const { stack: stagingStack } = draggedItem;
          const handCardsInStack = stagingStack.cards.filter(c => c.source === 'hand');

          if (handCardsInStack.length > 0) {
            // This is a "Reinforce" action that uses a hand card and ends the turn.
            const validation = validateReinforceBuildWithStack(stagingStack, buildToDropOn);
            if (!validation.valid) {
              showError(validation.message);
              return handleDisbandStagingStack(currentGameState, stagingStack);
            }
            return handleReinforceBuildWithStack(currentGameState, stagingStack, buildToDropOn);
          } else {
          // No hand cards in stack, so this is a staging move.
          if (buildToDropOn.owner === currentPlayer) {
            // This is a "Merge" action with only table cards that does NOT end the turn.
            const validation = validateMergeIntoOwnBuild(stagingStack, buildToDropOn, currentPlayer);
            if (!validation.valid) {
              showError(validation.message);
              return currentGameState; // Snap back on invalid merge
            }
            return handleMergeIntoOwnBuild(currentGameState, stagingStack, buildToDropOn);
          } else {
            // This is the new "Reinforce Opponent's Build" action that does NOT end the turn.
            const validation = validateReinforceOpponentBuildWithStack(stagingStack, buildToDropOn, currentPlayer);
            if (!validation.valid) {
              showError(validation.message);
              return currentGameState; // Snap back
            }
            return handleReinforceOpponentBuildWithStack(currentGameState, stagingStack, buildToDropOn);
            }
          }
        }

        const { card: draggedCard } = draggedItem;
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
          const playerOwnsBuild = tableCards.find(c => c.type === 'build' && c.owner === currentPlayer);

          if (playerOwnsBuild) {
            // Player has a build, so this is a potential "Extend-to-Merge"
            const validation = validateExtendToMerge(playerOwnsBuild, buildToDropOn, draggedCard);
            if (validation.valid) {
              actions.push(createActionOption(
                'extendToMerge',
                `Merge into your build of ${playerOwnsBuild.value}`,
                { draggedItem, opponentBuild: buildToDropOn, ownBuild: playerOwnsBuild }
              ));
            }
          } else {
            // Standard "Add to Opponent Build"
            const validation = validateAddToOpponentBuild(buildToDropOn, draggedCard, playerHand, tableCards, currentPlayer);
            if (validation.valid) {
              const newBuildValue = buildToDropOn.value + rankValue(draggedCard.rank);
              actions.push(createActionOption('addToOpponentBuild', `Extend to ${newBuildValue}`, { draggedItem, buildToAddTo: buildToDropOn }));
            }
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
      case 'extendToMerge':
        return handleExtendToMerge(currentGameState, draggedItem.card, action.payload.opponentBuild, action.payload.ownBuild);
      default:
        return currentGameState;
    }
  };

  const handleCancelStagingStackAction = useCallback((stack) => {
    setGameState(currentGameState => {
      return handleCancelStagingStack(currentGameState, stack);
    });
  }, []);

  const handleStageOpponentCardAction = useCallback((item) => {
    setGameState(currentGameState => {
      if (currentGameState.currentPlayer !== item.player) {
        showError("It's not your turn!");
        return currentGameState;
      }

      // --- NEW VALIDATION: Enforce one temp stack at a time ---
      const { tableCards, currentPlayer } = currentGameState;
      const playerAlreadyHasTempStack = tableCards.some(
        s => s.type === 'temporary_stack' && s.owner === currentPlayer
      );
      if (playerAlreadyHasTempStack) {
        showError("You can only have one staging stack at a time.");
        return currentGameState;
      }
      return handleStageOpponentCard(currentGameState, item.card);
    });
  }, [showError]);

  const handleConfirmStagingStackAction = useCallback((stack) => {
    setGameState(currentGameState => {
      const { playerHands, tableCards, currentPlayer } = currentGameState;
      const validation = validateFinalizeStagingStack(stack, playerHands[currentPlayer], tableCards, currentPlayer);

      if (!validation.valid) {
        showError(validation.message);
        return currentGameState;
      }

      return handleFinalizeStagingStack(currentGameState, stack);
    });
  }, [showError]);

  return { gameState, modalInfo, handleTrailCard, handleDropOnCard, handleModalAction, setModalInfo, executeAction, handleCancelStagingStackAction, handleStageOpponentCardAction, handleConfirmStagingStackAction };
};