import { updateGameState, nextPlayer } from './game-state.js';
import { rankValue, removeCardFromHand, removeCardsFromTable, sortCardsByRank, calculateCardSum, generateBuildId, findOpponentMatchingCards, createCaptureStack } from './card-operations.js';
import { canPartitionIntoSums } from './algorithms.js';
import { validateBuild, validateAddToBuild } from './validation.js';
import { logGameState } from './game-state.js';

export const handleTrail = (gameState, card) => {
  const { playerHands, tableCards, currentPlayer } = gameState;

  // Remove card from hand
  const newPlayerHands = removeCardFromHand(playerHands, currentPlayer, card);
  if (!newPlayerHands) {
    return gameState; // Card not found
  }

  // Create new state
  const newState = updateGameState(gameState, {
    playerHands: newPlayerHands,
    tableCards: [...tableCards, card],
  });

  logGameState(`Player ${currentPlayer + 1} trailed a ${card.rank}`, nextPlayer(newState));
  return nextPlayer(newState);
};

export const handleBuild = (gameState, draggedItem, tableCardsInBuild, buildValue, biggerCard, smallerCard) => {
  const { playerHands, tableCards, playerCaptures, currentPlayer } = gameState;
  const { card: playerCard, source } = draggedItem;
  const playerHand = playerHands[currentPlayer];

  // 1. Validate the build
  const validation = validateBuild(playerHand, playerCard, buildValue, tableCards, currentPlayer);
  if (!validation.valid) {
    console.warn(validation.message);
    return gameState;
  }

  // 2. Remove the played card from its source (hand or table)
  let newPlayerHands = playerHands;
  let tempTableCards = tableCards; // Start with the original table
  if (source === 'table') {
    tempTableCards = removeCardsFromTable(tableCards, [playerCard]);
  } else { // Default to hand for builds
    newPlayerHands = removeCardFromHand(playerHands, currentPlayer, playerCard);
    if (!newPlayerHands) return gameState;
  }

  // 3. Determine the cards that make up the initial build action
  let initialBuildCards;
  if (biggerCard && smallerCard) {
    // Sum build: e.g., player's 6 on table's 2
    initialBuildCards = [biggerCard, smallerCard];
  } else {
    // Same-value build: e.g., player's 8 on table's 8
    const sortedTableCards = sortCardsByRank(tableCardsInBuild);
    initialBuildCards = [...sortedTableCards, playerCard];
  }

  // 4. NEW: Check for other matching items on the table to auto-group
  const buildCardIds = tableCardsInBuild.map(c => `${c.rank}${c.suit}`);
  const matchingItemsOnTable = tempTableCards.filter(item => {
    if (item.value !== buildValue) return false;
    if (item.type === 'build') return true; // Always group with existing builds
    if (!item.type && !buildCardIds.includes(`${item.rank}${item.suit}`)) return true; // It's a loose card not in our build action
    return false;
  });

  let finalTableCards;
  let newBuild;

  if (matchingItemsOnTable.length > 0) {
    // Auto-grouping path: Consolidate all cards, placing matching table cards at the bottom.
    const baseCards = matchingItemsOnTable.flatMap(item => item.cards || [item]);
    const sortedBaseCards = sortCardsByRank(baseCards);

    // The cards from the player's immediate action are placed on top of the base.
    // initialBuildCards is already ordered correctly (e.g., [bigger, smaller] for a sum build).
    const allConsolidatedCards = [...sortedBaseCards, ...initialBuildCards];

    const itemsToRemoveFromTable = [...tableCardsInBuild, ...matchingItemsOnTable];

    newBuild = {
      buildId: generateBuildId(),
      type: 'build',
      cards: allConsolidatedCards, // Use the new custom order
      value: buildValue,
      owner: currentPlayer,
      isExtendable: false,
    };
    finalTableCards = removeCardsFromTable(tempTableCards, itemsToRemoveFromTable);
    finalTableCards.push(newBuild);
  } else {
    // Standard build path (no auto-grouping)
    newBuild = { buildId: generateBuildId(), type: 'build', cards: initialBuildCards, value: buildValue, owner: currentPlayer, isExtendable: true };
    finalTableCards = removeCardsFromTable(tempTableCards, tableCardsInBuild);
    finalTableCards.push(newBuild);
  }

  // --- NEW: "Automatic Steal" from opponent's capture pile ---
  let finalPlayerCaptures = playerCaptures;
  const opponentIndex = 1 - currentPlayer;
  const opponentCaps = playerCaptures[opponentIndex];

  if (opponentCaps && opponentCaps.length > 0) {
    const lastCaptureGroup = opponentCaps[opponentCaps.length - 1];
    if (lastCaptureGroup && lastCaptureGroup.length > 0) {
      const topCard = lastCaptureGroup[lastCaptureGroup.length - 1];
      if (rankValue(topCard.rank) === buildValue) {
        // Match found! Steal the card.
        const stolenCard = { ...topCard }; // Create a clean copy

        // 1. Add stolen card to the new build (at the bottom/base).
        newBuild.cards.unshift(stolenCard);

        // 2. Remove the card from the opponent's capture pile.
        const newOpponentCaps = opponentCaps.map((group, index) =>
          index === opponentCaps.length - 1 ? group.slice(0, -1) : group
        ).filter(group => group.length > 0); // Remove empty groups

        finalPlayerCaptures = [...playerCaptures];
        finalPlayerCaptures[opponentIndex] = newOpponentCaps;
      }
    }
  }

  const newState = updateGameState(gameState, {
    playerHands: newPlayerHands,
    tableCards: finalTableCards,
    playerCaptures: finalPlayerCaptures,
  });

  logGameState(`Player ${currentPlayer + 1} built a ${buildValue}`, nextPlayer(newState));
  return nextPlayer(newState);
};

export const handleAddToBuild = (gameState, playerCard, tableCard, buildToAddTo) => {
  const { playerHands, tableCards, currentPlayer } = gameState;

  // Validate the add to build action
  const validation = validateAddToBuild(buildToAddTo, playerCard, tableCard, playerHands[currentPlayer]);
  if (!validation.valid) {
    console.warn(validation.message);
    return gameState;
  }

  // Create updated build
  const newBuildCards = [...buildToAddTo.cards, playerCard, tableCard];
  const sortedCards = sortCardsByRank(newBuildCards);

  const newBuild = {
    ...buildToAddTo,
    cards: sortedCards,
    value: calculateCardSum(sortedCards),
  };

  // Update game state
  const newPlayerHands = removeCardFromHand(playerHands, currentPlayer, playerCard);
  if (!newPlayerHands) {
    return gameState;
  }

  // Remove old build and loose card, add new build
  const newTableCards = tableCards.filter(item => {
    if (item.buildId === buildToAddTo.buildId) return false;
    if (!item.type && item.rank === tableCard.rank && item.suit === tableCard.suit) return false;
    return true;
  });
  newTableCards.push(newBuild);

  const newState = updateGameState(gameState, {
    playerHands: newPlayerHands,
    tableCards: newTableCards,
  });

  logGameState(`Player ${currentPlayer + 1} added to build of ${newBuild.value}`, nextPlayer(newState));
  return nextPlayer(newState);
};

export const handleReinforceBuildWithStack = (gameState, stack, targetBuild) => {
  let { playerHands, tableCards, playerCaptures, currentPlayer } = gameState;

  // Validation is handled in useGameActions.js

  // --- EXECUTION ---
  // The card from hand was already removed when the staging stack was created.
  const newPlayerHands = playerHands;
  const cardsForPartition = stack.cards.map(({ source, ...card }) => card); // Strip source for validation

  const opponentCardsInStack = stack.cards.filter(c => c.source === 'opponentCapture');
  let newPlayerCaptures = [...playerCaptures];
  if (opponentCardsInStack.length > 0) {
    const opponentIndex = 1 - currentPlayer;
    let opponentCaps = [...playerCaptures[opponentIndex]];
    let cardsToRemoveCount = opponentCardsInStack.length;

    while (cardsToRemoveCount > 0 && opponentCaps.length > 0) {
      let lastGroup = opponentCaps[opponentCaps.length - 1];
      let cardsPoppedCount = Math.min(cardsToRemoveCount, lastGroup.length);
      lastGroup.splice(-cardsPoppedCount); // Remove cards from the end
      cardsToRemoveCount -= cardsPoppedCount;
      if (lastGroup.length === 0) {
        opponentCaps.pop(); // Remove the group if it's now empty
      }
    }
    newPlayerCaptures[opponentIndex] = opponentCaps;
  }

  // Create the new, reinforced build by concatenating the existing build with the new cards.
  // The cards from the stack are already ordered as the user arranged them.
  const allNewBuildCards = [...targetBuild.cards, ...cardsForPartition];

  const newBuild = {
    buildId: generateBuildId(),
    type: 'build',
    cards: allNewBuildCards,
    value: targetBuild.value, // The value of the build does not change
    owner: currentPlayer,      // Ownership is always transferred to the current player
    isExtendable: false,       // Reinforced builds cannot be extended further
  };

  // Update the table by removing the old build and the temporary stack, then adding the new build.
  const itemsToRemoveFromTable = [targetBuild, stack];
  const finalTableCards = removeCardsFromTable(tableCards, itemsToRemoveFromTable);
  finalTableCards.push(newBuild);

  const newState = updateGameState(gameState, {
    playerHands: newPlayerHands,
    tableCards: finalTableCards,
    playerCaptures: newPlayerCaptures,
  });

  logGameState(`Player ${currentPlayer + 1} reinforced a build of ${targetBuild.value}`, nextPlayer(newState));
  return nextPlayer(newState);
};

export const handleBaseBuild = (gameState, draggedItem, baseCard, otherCardsInBuild) => {
  const { playerHands, tableCards, playerCaptures, currentPlayer } = gameState;
  const { card: playerCard, source } = draggedItem;

  let newPlayerHands = playerHands;
  let newTableCards = tableCards;
  let newPlayerCaptures = playerCaptures;

  // A base build should only be initiated from the hand, but we handle sources just in case.
  if (source === 'table') {
    newTableCards = removeCardsFromTable(tableCards, [playerCard]);
  } else { // Default to hand
    newPlayerHands = removeCardFromHand(playerHands, currentPlayer, playerCard);
    if (!newPlayerHands) return gameState;
  }


  // Remove baseCard and otherCardsInBuild from table
  const cardsToRemoveFromTable = [baseCard, ...otherCardsInBuild];
  const finalTableCards = removeCardsFromTable(newTableCards, cardsToRemoveFromTable);

  // Construct the new build's cards array with proper combination grouping
  // otherCardsInBuild is an array of combinations, each combination is an array of cards
  let buildCards = [baseCard]; // Start with base card

  // Process each combination: sort within combination (bigger to smaller) and add to build
  otherCardsInBuild.forEach(combination => {
    // Sort each combination by rank (bigger to smaller for proper stacking)
    const sortedCombination = [...combination].sort((a, b) => rankValue(b.rank) - rankValue(a.rank));
    buildCards = [...buildCards, ...sortedCombination];
  });

  // Add player's card on top
  buildCards = [...buildCards, playerCard];

  const newBuild = {
    buildId: generateBuildId(),
    type: 'build',
    cards: buildCards,
    value: playerCard.value,
    owner: currentPlayer,
    isExtendable: false,
  };

  finalTableCards.push(newBuild);

  const newState = updateGameState(gameState, {
    playerHands: newPlayerHands,
    tableCards: finalTableCards,
    playerCaptures: newPlayerCaptures,
  });

  logGameState(`Player ${currentPlayer + 1} created a base build with a ${playerCard.rank}`, nextPlayer(newState));
  return nextPlayer(newState);
};

export const handleCreateBuildFromStack = (gameState, draggedItem, stack) => {
  const { currentPlayer, playerHands, tableCards } = gameState;
  const { card: handCard } = draggedItem;

  // 1. Calculate new build properties
  const stackValue = calculateCardSum(stack.cards);
  const handCardValue = rankValue(handCard.rank);
  const isReinforce = stackValue === handCardValue;
  const newBuildValue = isReinforce ? stackValue : stackValue + handCardValue;

  const allCardsInBuild = [...stack.cards, handCard].sort((a, b) => rankValue(b.rank) - rankValue(a.rank));

  // 2. Create the new build object
  const newBuild = {
    buildId: generateBuildId(),
    type: 'build',
    cards: allCardsInBuild,
    value: newBuildValue,
    owner: currentPlayer,
    isExtendable: !isReinforce,
  };

  // 3. Update game state
  // Remove hand card
  const newPlayerHands = removeCardFromHand(playerHands, currentPlayer, handCard);
  if (!newPlayerHands) {
    console.error("Card for build not found in hand.");
    return gameState;
  }

  // Remove temporary stack from table and add new build
  const newTableCards = tableCards.filter(s => s.stackId !== stack.stackId);
  newTableCards.push(newBuild);

  const newState = updateGameState(gameState, { playerHands: newPlayerHands, tableCards: newTableCards });
  logGameState(`Player ${currentPlayer + 1} created a build of ${newBuildValue} from a stack`, nextPlayer(newState));
  return nextPlayer(newState);
};

export const handleAddToOpponentBuild = (gameState, draggedItem, buildToAddTo) => {
  const { playerHands, tableCards, playerCaptures, currentPlayer } = gameState;
  const { card: playerCard, source } = draggedItem;
  // Validation is handled in useGameActions.

  const newBuildValue = buildToAddTo.value + rankValue(playerCard.rank);

  // Create the new set of cards for the build, sorted descending for display
  const newBuildCards = [...buildToAddTo.cards, playerCard];
  const sortedCards = newBuildCards.sort((a, b) => rankValue(b.rank) - rankValue(a.rank));

  const newBuild = {
    buildId: generateBuildId(),
    type: 'build',
    cards: sortedCards,
    value: newBuildValue,
    owner: currentPlayer, // Ownership is transferred to the current player
    isExtendable: sortedCards.length < 5, // A build is extendable until it has 5 cards.
  };

  let newPlayerHands = playerHands;
  let newTableCards = tableCards;
  let newPlayerCaptures = playerCaptures;

  // This action should only come from the hand, but we handle sources for robustness.
  if (source === 'table') {
    newTableCards = removeCardsFromTable(tableCards, [playerCard]);
  } else { // Default to hand
    newPlayerHands = removeCardFromHand(playerHands, currentPlayer, playerCard);
    if (!newPlayerHands) return gameState;
  }

  // Remove old build from table and add the new one
  const finalTableCards = removeCardsFromTable(newTableCards, [buildToAddTo]);
  finalTableCards.push(newBuild);

  const newState = updateGameState(gameState, {
    playerHands: newPlayerHands,
    tableCards: finalTableCards,
    playerCaptures: newPlayerCaptures,
  });

  logGameState(`Player ${currentPlayer + 1} extended opponent's build to ${newBuild.value}`, nextPlayer(newState));
  return nextPlayer(newState);
};

export const handleAddToOwnBuild = (gameState, draggedItem, buildToAddTo) => {
  const { card: playerCard } = draggedItem;
  const { currentPlayer, playerHands, tableCards } = gameState;

  // Validation is assumed to have happened in useGameActions

  // Determine if this is a "reinforce" (7 on a 7) or "increase" (2 on a 5) action
  const isReinforce = rankValue(playerCard.rank) === buildToAddTo.value;
  const newBuildValue = isReinforce
    ? buildToAddTo.value
    : buildToAddTo.value + rankValue(playerCard.rank);

  // The new card is always placed on top of the existing build cards.
  const newBuildCards = [...buildToAddTo.cards, playerCard];

  const newBuild = {
    ...buildToAddTo, // Retains original buildId, owner
    value: newBuildValue,
    cards: newBuildCards,
    isExtendable: !isReinforce, // A reinforced build (e.g., 7,7) cannot be extended further
  };

  // Update table: remove old build, add new one
  const newTableCards = tableCards.filter(b => b.buildId !== buildToAddTo.buildId);
  newTableCards.push(newBuild);

  // Update player hand
  const newPlayerHands = removeCardFromHand(playerHands, currentPlayer, playerCard);
  if (!newPlayerHands) {
      console.error("Card for 'add to own build' not found in hand.");
      return gameState; // Should not happen if validation is correct
  }

  const newState = updateGameState(gameState, {
    tableCards: newTableCards,
    playerHands: newPlayerHands,
  });

  logGameState(`Player ${currentPlayer + 1} added to their build, creating a new build of ${newBuildValue}`, nextPlayer(newState));
  return nextPlayer(newState);
};

export const handleCapture = (gameState, draggedItem, selectedTableCards, opponentCard = null) => {
  const { playerHands, tableCards, playerCaptures, currentPlayer } = gameState;
  const { card: selectedCard, source } = draggedItem;

  // --- Contextual check for "Implicit Add to Build" ---
  // If a player has a build, and makes a combination that matches their build's value,
  // it should be treated as adding to the build, not a capture.
  const playerOwnBuild = tableCards.find(item => item.type === 'build' && item.owner === currentPlayer);
  if (playerOwnBuild && source === 'hand' && !opponentCard) {
    const potentialStackCards = [selectedCard, ...selectedTableCards.flatMap(item => item.cards || [item])];

    // Check if the combined cards can be partitioned into sums of the build's value.
    // e.g., hand(4) + table(4) for a build of 8.
    if (canPartitionIntoSums(potentialStackCards, playerOwnBuild.value)) {
      // This is an "add to build" action, not a capture.
      const newPlayerHands = removeCardFromHand(playerHands, currentPlayer, selectedCard);
      if (!newPlayerHands) return gameState;

      const allNewBuildCards = [...playerOwnBuild.cards, ...potentialStackCards];

      const newBuild = {
        buildId: generateBuildId(),
        type: 'build',
        cards: allNewBuildCards,
        value: playerOwnBuild.value,
        owner: currentPlayer,
        isExtendable: false, // Reinforced builds cannot be extended further
      };

      const itemsToRemoveFromTable = [playerOwnBuild, ...selectedTableCards];
      const finalTableCards = removeCardsFromTable(tableCards, itemsToRemoveFromTable);
      finalTableCards.push(newBuild);

      const newState = updateGameState(gameState, {
        playerHands: newPlayerHands,
        tableCards: finalTableCards,
      });

      logGameState(`Player ${currentPlayer + 1} reinforced their build of ${playerOwnBuild.value}`, nextPlayer(newState));
      return nextPlayer(newState);
    }
  }

  let newPlayerHands = playerHands;
  let newTableCards = tableCards;
  let newPlayerCaptures = playerCaptures;

  // Update game state
  if (source === 'table') {
    newTableCards = removeCardsFromTable(tableCards, [selectedCard]);
  } else { // Default to hand
    newPlayerHands = removeCardFromHand(playerHands, currentPlayer, selectedCard);
    if (!newPlayerHands) return gameState;
  }

  // Remove captured cards from table
  const finalTableCards = newTableCards.filter(item => {
    // Check if the current table item 'item' is one of the selectedTableCards
    return !selectedTableCards.some(capturedItem => {
      if (item.type === 'build' && capturedItem.type === 'build') {
        return item.buildId === capturedItem.buildId;
      }
      if (item.type === 'temporary_stack' && capturedItem.type === 'temporary_stack') {
        return item.stackId === capturedItem.stackId;
      }
      if (!item.type && !capturedItem.type) {
        return item.rank === capturedItem.rank && item.suit === capturedItem.suit;
      }
      return false;
    });
  });

  // Handle opponent's card removal if involved
  let finalPlayerCaptures = [...newPlayerCaptures];
  if (opponentCard) {
    const opponentIndex = 1 - currentPlayer; // Get opponent's index
    finalPlayerCaptures[opponentIndex] = newPlayerCaptures[opponentIndex].map(group =>
      group.filter(card =>
        !(card.rank === opponentCard.rank && card.suit === opponentCard.suit)
      )
    ).filter(group => group.length > 0); // Remove empty groups
  }

  // Flatten captured cards from builds and loose cards
  const flattenedCapturedCards = selectedTableCards.flatMap(item =>
    (item.type === 'build' || item.type === 'temporary_stack') ? item.cards : [item]
  );

  // Create properly ordered capture stack
  const capturedGroup = createCaptureStack(selectedCard, flattenedCapturedCards, opponentCard);

  // Add captured cards to player's captures
  finalPlayerCaptures[currentPlayer] = [...finalPlayerCaptures[currentPlayer], capturedGroup];

  const newState = updateGameState(gameState, {
    playerHands: newPlayerHands,
    tableCards: finalTableCards,
    playerCaptures: finalPlayerCaptures,
    lastCapturer: currentPlayer,
  });

  const captureDescription = opponentCard
    ? `Player ${currentPlayer + 1} captured with a ${selectedCard.rank} (using opponent's ${opponentCard.rank})`
    : `Player ${currentPlayer + 1} captured with a ${selectedCard.rank}`;

  logGameState(captureDescription, nextPlayer(newState));
  return nextPlayer(newState);
};

/**
 * Creates a temporal build using opponent's card for enhanced capture setup.
 * @param {object} gameState - The current game state.
 * @param {object} opponentCard - The opponent's card to use.
 * @param {object} tableCard - The table card to combine with.
 * @returns {object} The updated game state.
 */
export const handleTemporalBuild = (gameState, opponentCard, tableCard) => {
  const { tableCards, currentPlayer } = gameState;

  // Create temporal build with opponent's card and table card
  const temporalBuild = {
    buildId: generateBuildId(),
    type: 'temporal_build',
    cards: [opponentCard, tableCard],
    value: rankValue(opponentCard.rank),
    owner: currentPlayer,
    isTemporal: true
  };

  // Add temporal build to table
  const newTableCards = [...tableCards, temporalBuild];

  const newState = updateGameState(gameState, {
    tableCards: newTableCards,
  });

  logGameState(`Player ${currentPlayer + 1} created temporal build with opponent's ${opponentCard.rank}`, newState);
  return newState;
};

/**
 * Transitions the game to the next round, dealing new cards and carrying over table cards.
 * @param {object} gameState - The current game state.
 * @returns {object} The updated game state for the new round.
 */
export const startNextRound = (gameState) => {
  let { deck, playerHands, tableCards } = gameState;

  // Per the rules, 20 cards should be left for round 2.
  if (deck.length < 20) {
    console.error("Not enough cards in the deck to start round 2.", deck.length);
    // This might indicate an end-of-game condition if the deck is empty.
    return gameState;
  }

  const newPlayerHands = [[...playerHands[0]], [...playerHands[1]]];

  // Create a copy of the deck to avoid mutating the original
  let workingDeck = [...deck];

  // Deal 10 cards to each player for round 2
  for (let i = 0; i < 10; i++) {
    if (workingDeck.length > 0) newPlayerHands[0].push(workingDeck.pop());
    if (workingDeck.length > 0) newPlayerHands[1].push(workingDeck.pop());
  }

  return updateGameState(gameState, {
    deck: workingDeck,
    playerHands: newPlayerHands,
    round: 2,
    // Keep the same table cards from round 1
    tableCards: [...tableCards],
  });
};

/**
 * Sweeps the remaining table cards and gives them to the last player who captured.
 * @param {object} gameState - The current game state.
 * @returns {object} The updated game state.
 */
export const handleSweep = (gameState) => {
  const { tableCards, playerCaptures, lastCapturer } = gameState;

  if (tableCards.length === 0 || lastCapturer === null) {
    return gameState; // Nothing to sweep or no one to give it to
  }

  const flattenedTableCards = tableCards.flatMap(item =>
    item.type === 'build' ? item.cards : [item]
  );

  const newPlayerCaptures = [...playerCaptures];
  // Create a new capture group for the swept cards. The order is immaterial.
  newPlayerCaptures[lastCapturer] = [...newPlayerCaptures[lastCapturer], flattenedTableCards];

  const newState = updateGameState(gameState, {
    tableCards: [], // Clear the table
    playerCaptures: newPlayerCaptures,
  });

  logGameState(`Player ${lastCapturer + 1} swept the remaining cards`, newState);
  return newState;
};

/**
 * Calculates the final scores for each player based on the rules in GEMINI.md.
 * @param {Array<Array<Array<Card>>>} playerCaptures - The captured cards for both players.
 * @returns {Array<number>} The final scores for player 1 and player 2.
 */
export const calculateScores = (playerCaptures) => {
  const details = [
    { mostCards: 0, mostSpades: 0, bigCasino: 0, littleCasino: 0, aces: 0, total: 0, cardCount: 0, spadeCount: 0 },
    { mostCards: 0, mostSpades: 0, bigCasino: 0, littleCasino: 0, aces: 0, total: 0, cardCount: 0, spadeCount: 0 }
  ];

  const allPlayerCards = playerCaptures.map(captures => captures.flat());

  // Tally card counts and spade counts
  details[0].cardCount = allPlayerCards[0].length;
  details[1].cardCount = allPlayerCards[1].length;
  details[0].spadeCount = allPlayerCards[0].filter(c => c.suit === '♠').length;
  details[1].spadeCount = allPlayerCards[1].filter(c => c.suit === '♠').length;

  // Award points for Most Cards (2 pts for >20 cards, 1 pt each for a 20-20 tie)
  if (details[0].cardCount > 20) {
    details[0].mostCards = 2;
  } else if (details[1].cardCount > 20) {
    details[1].mostCards = 2;
  } else if (details[0].cardCount === 20 && details[1].cardCount === 20) {
    details[0].mostCards = 1;
    details[1].mostCards = 1;
  }

  // Award points for Most Spades (2 pts for 6+ spades)
  if (details[0].spadeCount >= 6) details[0].mostSpades = 2;
  if (details[1].spadeCount >= 6) details[1].mostSpades = 2;

  // Award points for specific cards
  allPlayerCards.forEach((cards, playerIndex) => {
    cards.forEach(card => {
      if (card.rank === 'A') details[playerIndex].aces += 1;
      if (card.rank === '10' && card.suit === '♦') details[playerIndex].bigCasino = 2;
      if (card.rank === '2' && card.suit === '♠') details[playerIndex].littleCasino = 1;
    });
  });

  // Calculate total scores
  details.forEach((playerDetails) => {
    playerDetails.total =
      playerDetails.mostCards +
      playerDetails.mostSpades +
      playerDetails.bigCasino +
      playerDetails.littleCasino +
      playerDetails.aces;
  });

  const finalScores = details.map(d => d.total);
  const winner = finalScores[0] > finalScores[1] ? 0 : (finalScores[1] > finalScores[0] ? 1 : null);

  return { scores: finalScores, details, winner };
};

/**
 * Ends the game, calculates scores, and determines the winner.
 * @param {object} gameState - The current game state.
 * @returns {object} The final game state with scores and winner.
 */
export const endGame = (gameState) => {
  const { scores, details, winner } = calculateScores(gameState.playerCaptures);
  return updateGameState(gameState, { scores, winner, scoreDetails: details, gameOver: true });
};

/**
 * Creates a temporary "staging stack" on the table without ending the player's turn.
 * This is used when a player who already owns a build combines cards on the table.
 * @param {object} gameState - The current game state.
 * @param {object} handCard - The card from the player's hand.
 * @param {object} tableCard - The loose card on the table to stack on.
 * @returns {object} The updated game state with the new staging stack.
 */
export const handleCreateStagingStack = (gameState, handCard, tableCard) => {
  const { playerHands, tableCards, currentPlayer } = gameState;

  const targetIndex = tableCards.findIndex(c => !c.type && c.rank === tableCard.rank && c.suit === tableCard.suit);
  if (targetIndex === -1) {
    console.error("Target card for staging stack not found on table.");
    return gameState;
  }

  // Determine the correct stacking order: bigger card at the bottom, smaller on top.
  const orderedCards = rankValue(handCard.rank) > rankValue(tableCard.rank)
    ? [{ ...handCard, source: 'hand' }, { ...tableCard, source: 'table' }]
    : [{ ...tableCard, source: 'table' }, { ...handCard, source: 'hand' }];

  const newStack = {
    stackId: `temp-${Date.now()}`,
    type: 'temporary_stack',
    cards: orderedCards,
    owner: currentPlayer,
  };

  const newPlayerHands = removeCardFromHand(playerHands, currentPlayer, handCard);
  if (!newPlayerHands) return gameState;

  const finalTableCards = [...tableCards];
  finalTableCards.splice(targetIndex, 1, newStack); // Replace the target card with the new stack

  return updateGameState(gameState, { playerHands: newPlayerHands, tableCards: finalTableCards });
};

/**
 * Adds a card from the player's hand to an existing temporary staging stack.
 * This does not end the player's turn.
 * @param {object} gameState - The current game state.
 * @param {object} handCard - The card from the player's hand to add.
 * @param {object} targetStack - The temporary stack to add the card to.
 * @returns {object} The updated game state.
 */
export const handleAddToStagingStack = (gameState, handCard, targetStack) => {
  const { playerHands, tableCards, currentPlayer } = gameState;

  // 1. Remove card from hand
  const newPlayerHands = removeCardFromHand(playerHands, currentPlayer, handCard);
  if (!newPlayerHands) return gameState;

  // 2. Create the updated stack by adding the new card
  const newStack = { ...targetStack, cards: [...targetStack.cards, { ...handCard, source: 'hand' }] };

  // 3. Update the table by replacing the old stack with the new one
  const stackIndex = tableCards.findIndex(s => s.stackId === targetStack.stackId);
  const newTableCards = [...tableCards];
  if (stackIndex !== -1) {
    newTableCards[stackIndex] = newStack;
  } else {
    // Fallback if something went wrong
    const filteredTable = tableCards.filter(s => s.stackId !== targetStack.stackId);
    filteredTable.push(newStack);
    newTableCards = filteredTable;
  }

  // 4. Return the new state (turn does not end)
  return updateGameState(gameState, { playerHands: newPlayerHands, tableCards: newTableCards });
};

/**
 * Disbands a temporary staging stack when an invalid move is attempted with it.
 * Returns its cards to the table as loose cards and ends the player's turn.
 * @param {object} gameState - The current game state.
 * @param {object} stackToDisband - The temporary stack to disband.
 * @returns {object} The updated game state.
 */
export const handleDisbandStagingStack = (gameState, stackToDisband) => {
  const { tableCards, currentPlayer } = gameState;

  // 1. Get the cards from the stack, stripping the 'source' property so they become standard loose cards.
  const looseCards = stackToDisband.cards.map(({ source, ...card }) => card);

  // 2. Remove the temporary stack from the table.
  const newTableCards = tableCards.filter(s => s.stackId !== stackToDisband.stackId);

  // 3. Add the loose cards back to the table.
  newTableCards.push(...looseCards);

  const newState = updateGameState(gameState, { tableCards: newTableCards });
  logGameState(`Player ${currentPlayer + 1}'s temporary stack was invalid and disbanded.`, nextPlayer(newState));
  return nextPlayer(newState);
};

/**
 * Cancels a temporary staging stack, returning its cards to their original positions.
 * This does not end the player's turn.
 * @param {object} gameState - The current game state.
 * @param {object} stackToCancel - The temporary stack to cancel.
 * @returns {object} The updated game state.
 */
export const handleCancelStagingStack = (gameState, stackToCancel) => {
  let { playerHands, tableCards, playerCaptures, currentPlayer } = gameState;

  const handCards = [];
  const newLooseCards = [];
  const opponentCards = [];

  // 1. Sort cards back to their original sources by reading their 'source' property
  for (const card of stackToCancel.cards) {
    const cardData = { ...card };
    delete cardData.source; // Clean up the source property

    if (card.source === 'hand') handCards.push(cardData);
    else if (card.source === 'opponentCapture') opponentCards.push(cardData);
    else newLooseCards.push(cardData); // Default to table
  }

  // 2. Update player's hand
  const currentHand = [...playerHands[currentPlayer], ...handCards];
  playerHands = [...playerHands];
  playerHands[currentPlayer] = currentHand;

  // 3. Update opponent's capture pile (if applicable)
  if (opponentCards.length > 0) {
    const opponentIndex = 1 - currentPlayer;
    let opponentCaps = [...(playerCaptures[opponentIndex] || [])];
    if (opponentCaps.length > 0) {
      // Add cards back to the last capture group
      opponentCaps[opponentCaps.length - 1].push(...opponentCards);
    } else {
      // If opponent had no captures, create a new group
      opponentCaps.push(opponentCards);
    }
    playerCaptures = [...playerCaptures];
    playerCaptures[opponentIndex] = opponentCaps;
  }

  // 4. Update table cards by removing the stack and adding back any loose cards
  let newTableCards = tableCards.filter(s => s.stackId !== stackToCancel.stackId);
  newTableCards.push(...newLooseCards);

  // 5. Return the new state (turn does not end)
  return updateGameState(gameState, { playerHands, tableCards: newTableCards, playerCaptures });
};

/**
 * Merges a temporary stack of table cards into the player's own existing build.
 * This action does not end the player's turn.
 * @param {object} gameState - The current game state.
 * @param {object} stack - The temporary stack to merge.
 * @param {object} targetBuild - The player's build to merge into.
 * @returns {object} The updated game state.
 */
export const handleMergeIntoOwnBuild = (gameState, stack, targetBuild) => {
  const { tableCards } = gameState;

  // 1. Get the cards from the stack, stripping the 'source' property.
  const cardsFromStack = stack.cards.map(({ source, ...card }) => card);

  // 2. Combine the cards. The new cards go on top.
  const newBuildCards = [...targetBuild.cards, ...cardsFromStack];

  // 3. Create the new, larger build object, replacing the old one.
  const newBuild = { ...targetBuild, cards: newBuildCards };

  // 4. Update the table by removing the old items and adding the new merged build.
  const newTableCards = removeCardsFromTable(tableCards, [targetBuild, stack]);
  newTableCards.push(newBuild);

  // 5. Return the new state, but DO NOT end the player's turn.
  return updateGameState(gameState, { tableCards: newTableCards });
};

/**
 * Stages a card from the opponent's capture pile onto the table as a new temporary stack.
 * This action does not end the player's turn.
 * @param {object} gameState - The current game state.
 * @param {object} opponentCard - The card from the opponent's capture pile.
 * @returns {object} The updated game state.
 */
export const handleStageOpponentCard = (gameState, opponentCard) => {
  let { playerCaptures, tableCards, currentPlayer } = gameState;

  // 1. Remove the card from the opponent's capture pile
  const opponentIndex = 1 - currentPlayer;
  const opponentCaps = playerCaptures[opponentIndex] || [];

  const newOpponentCaps = opponentCaps.map((group, index) =>
    index === opponentCaps.length - 1 ? group.slice(0, -1) : group
  ).filter(group => group.length > 0); // Remove empty groups if the last card was taken

  const newPlayerCaptures = [...playerCaptures];
  newPlayerCaptures[opponentIndex] = newOpponentCaps;

  // 2. Create a new temporary stack on the table
  const newStack = {
    stackId: `temp-${Date.now()}`,
    type: 'temporary_stack',
    cards: [{ ...opponentCard, source: 'opponentCapture' }], // Tag the card with its origin
    owner: currentPlayer,
  };

  // 3. Return the new state without ending the turn
  return updateGameState(gameState, { playerCaptures: newPlayerCaptures, tableCards: [...tableCards, newStack] });
};

/**
 * Extends an opponent's build and merges it into the player's own build.
 * This is a staging action and does not end the player's turn.
 * @param {object} gameState - The current game state.
 * @param {object} handCard - The card from the player's hand.
 * @param {object} opponentBuild - The opponent's build to extend and absorb.
 * @param {object} ownBuild - The player's own build to merge into.
 * @returns {object} The updated game state.
 */
export const handleExtendToMerge = (gameState, handCard, opponentBuild, ownBuild) => {
  const { playerHands, tableCards, currentPlayer } = gameState;

  // 1. Remove the card from the player's hand.
  const newPlayerHands = removeCardFromHand(playerHands, currentPlayer, handCard);
  if (!newPlayerHands) return gameState;

  // 2. Combine all cards: own build cards + opponent build cards + hand card.
  // Sort the combined cards to ensure bigger cards are at the bottom of the stack.
  const allCards = [...ownBuild.cards, ...opponentBuild.cards, handCard].sort((a, b) => rankValue(b.rank) - rankValue(a.rank));

  // 3. Create the new, massive build, replacing the player's original build.
  const newMergedBuild = { ...ownBuild, cards: allCards, isExtendable: false };

  // 4. Remove the old builds from the table and add the new one.
  const newTableCards = removeCardsFromTable(tableCards, [ownBuild, opponentBuild]);
  newTableCards.push(newMergedBuild);

  // 5. Return the new state without ending the turn.
  return updateGameState(gameState, { playerHands: newPlayerHands, tableCards: newTableCards });
};

/**
 * Finalizes a temporary staging stack into a new, permanent build.
 * This action ends the player's turn.
 * @param {object} gameState - The current game state.
 * @param {object} stack - The temporary stack to finalize.
 * @returns {object} The updated game state.
 */
export const handleFinalizeStagingStack = (gameState, stack) => {
  const { tableCards, currentPlayer } = gameState;

  const buildValue = calculateCardSum(stack.cards.map(({ source, ...card }) => card));

  // Create the new permanent build
  const newBuild = {
    buildId: generateBuildId(),
    type: 'build',
    cards: stack.cards.map(({ source, ...card }) => card).sort((a, b) => rankValue(b.rank) - rankValue(a.rank)),
    value: buildValue,
    owner: currentPlayer,
    isExtendable: true,
  };

  const newTableCards = tableCards.filter(s => s.stackId !== stack.stackId);
  newTableCards.push(newBuild);

  const newState = updateGameState(gameState, { tableCards: newTableCards });
  logGameState(`Player ${currentPlayer + 1} finalized a build of ${newBuild.value}`, nextPlayer(newState));
  return nextPlayer(newState);
};

/**
 * Reinforces an opponent's build with a temporary stack of non-hand cards.
 * This is a staging action that does not end the player's turn.
 * @param {object} gameState - The current game state.
 * @param {object} stack - The temporary stack to merge.
 * @param {object} opponentBuild - The opponent's build to reinforce.
 * @returns {object} The updated game state.
 */
export const handleReinforceOpponentBuildWithStack = (gameState, stack, opponentBuild) => {
  const { tableCards } = gameState;

  // 1. Get the cards from the stack, stripping the 'source' property.
  const cardsFromStack = stack.cards.map(({ source, ...card }) => card);

  // 2. Combine the cards. The new cards go on top.
  const newBuildCards = [...opponentBuild.cards, ...cardsFromStack];

  // 3. Create the new, larger build object. Ownership does NOT change.
  const newBuild = {
    ...opponentBuild,
    cards: newBuildCards,
    isExtendable: false, // Reinforced builds cannot be extended further
  };

  // 4. Update the table by removing the old items and adding the new reinforced build.
  const newTableCards = removeCardsFromTable(tableCards, [opponentBuild, stack]);
  newTableCards.push(newBuild);

  // 5. Return the new state, but DO NOT end the player's turn.
  return updateGameState(gameState, { tableCards: newTableCards });
};