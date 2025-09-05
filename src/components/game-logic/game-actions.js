import { updateGameState, nextPlayer } from './game-state.js';
import { rankValue, removeCardFromHand, removeCardsFromTable, sortCardsByRank, calculateCardSum, generateBuildId, findOpponentMatchingCards, createCaptureStack } from './card-operations.js';
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

  // Validate the build
  const validation = validateBuild(playerHand, playerCard, buildValue, tableCards, currentPlayer);
  if (!validation.valid) {
    console.warn(validation.message);
    return gameState;
  }

  let newPlayerHands = playerHands;
  let newTableCards = tableCards;
  let newPlayerCaptures = playerCaptures;

  // Remove the played card from its source
  if (source === 'table') {
    newTableCards = removeCardsFromTable(tableCards, [playerCard]);
  } else { // Default to hand for builds
    newPlayerHands = removeCardFromHand(playerHands, currentPlayer, playerCard);
    if (!newPlayerHands) return gameState;
  }

  let allCardsInBuild;

  // Handle stacking order based on build type
  if (biggerCard && smallerCard) {
    // Sum build: bigger card at bottom, smaller card on top
    allCardsInBuild = [biggerCard, smallerCard];
  } else {
    // Same-value build: table cards at bottom (sorted), player's card on top
    const sortedTableCards = sortCardsByRank(tableCardsInBuild);
    allCardsInBuild = [...sortedTableCards, playerCard];
  }

  const newBuild = {
    buildId: generateBuildId(),
    type: 'build',
    cards: allCardsInBuild,
    value: buildValue,
    owner: currentPlayer,
    isExtendable: true,
  };

  // Update game state
  const finalTableCards = removeCardsFromTable(newTableCards, tableCardsInBuild);
  finalTableCards.push(newBuild);

  const newState = updateGameState(gameState, {
    playerHands: newPlayerHands,
    tableCards: finalTableCards,
    playerCaptures: newPlayerCaptures,
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
    isExtendable: false, // Extended builds cannot be extended further
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
 * Transitions the game to the next round, dealing new cards.
 * @param {object} gameState - The current game state.
 * @returns {object} The updated game state for the new round.
 */
export const startNextRound = (gameState) => {
  let { deck, playerHands } = gameState;

  // Per the rules, 20 cards should be left for round 2.
  if (deck.length < 20) {
    console.error("Not enough cards in the deck to start round 2.", deck.length);
    // This might indicate an end-of-game condition if the deck is empty.
    return gameState;
  }

  const newPlayerHands = [[...playerHands[0]], [...playerHands[1]]];

  // Deal 10 cards to each player for round 2
  for (let i = 0; i < 10; i++) {
    if (deck.length > 0) newPlayerHands[0].push(deck.pop());
    if (deck.length > 0) newPlayerHands[1].push(deck.pop());
  }

  return updateGameState(gameState, {
    deck,
    playerHands: newPlayerHands,
    round: 2,
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
  const scores = [0, 0];
  playerCaptures.forEach((captures, playerIndex) => {
    const allCards = captures.flat();
    let currentScore = 0;

    if (allCards.length >= 21) currentScore += 1;

    const spadeCount = allCards.filter(c => c.suit === '♠').length;
    if (spadeCount >= 6) currentScore += 2;

    allCards.forEach(card => {
      if (card.rank === 'A') currentScore += 1;
      if (card.rank === '10' && card.suit === '♦') currentScore += 2;
      if (card.rank === '2' && card.suit === '♠') currentScore += 1;
    });
    scores[playerIndex] = currentScore;
  });
  return scores;
};

/**
 * Ends the game, calculates scores, and determines the winner.
 * @param {object} gameState - The current game state.
 * @returns {object} The final game state with scores and winner.
 */
export const endGame = (gameState) => {
  const scores = calculateScores(gameState.playerCaptures);
  const winner = scores[0] > scores[1] ? 0 : (scores[1] > scores[0] ? 1 : null); // Handle ties

  return updateGameState(gameState, { scores, winner, gameOver: true });
};