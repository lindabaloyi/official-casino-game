import { updateGameState, nextPlayer } from './game-state.js';
import { rankValue, removeCardFromHand, removeCardsFromTable, sortCardsByRank, calculateCardSum, generateBuildId, findOpponentMatchingCards, createCaptureStack } from './card-operations.js';
import { validateTrail, validateBuild, validateAddToBuild } from './validation.js';
import { logGameState } from './game-state.js';

export const handleTrail = (gameState, card) => {
  const { playerHands, tableCards, currentPlayer, round } = gameState;

  // Validate the trail action
  const validation = validateTrail(tableCards, card, currentPlayer, round);
  if (!validation.valid) {
    // Instead of alert, we'll return the state and let the UI handle the error
    console.warn(validation.message);
    return gameState;
  }

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
    if (item.type === 'build') {
      return !selectedTableCards.some(capturedItem => capturedItem.buildId === item.buildId);
    } else {
      return !selectedTableCards.some(capturedItem =>
        capturedItem.rank === item.rank && capturedItem.suit === item.suit
      );
    }
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
    item.type === 'build' ? item.cards : [item]
  );

  // Create properly ordered capture stack
  const capturedGroup = createCaptureStack(selectedCard, flattenedCapturedCards, opponentCard);

  // Add captured cards to player's captures
  finalPlayerCaptures[currentPlayer] = [...finalPlayerCaptures[currentPlayer], capturedGroup];

  const newState = updateGameState(gameState, {
    playerHands: newPlayerHands,
    tableCards: finalTableCards,
    playerCaptures: finalPlayerCaptures,
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