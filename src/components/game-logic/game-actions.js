import { updateGameState, nextPlayer } from './game-state.js';
import { removeCardFromHand, removeCardsFromTable, sortCardsByRank, calculateCardSum, generateBuildId, findOpponentMatchingCards, createCaptureStack } from './card-operations.js';
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

export const handleBuild = (gameState, playerCard, tableCardsInBuild, buildValue) => {
  const { playerHands, tableCards, currentPlayer } = gameState;
  const playerHand = playerHands[currentPlayer];

  // Validate the build
  const validation = validateBuild(playerHand, playerCard, buildValue);
  if (!validation.valid) {
    console.warn(validation.message);
    return gameState;
  }

  // Create the build
  const allCardsInBuild = [playerCard, ...tableCardsInBuild];
  const sortedCards = sortCardsByRank(allCardsInBuild);

  const newBuild = {
    buildId: generateBuildId(),
    type: 'build',
    cards: sortedCards,
    value: buildValue,
    owner: currentPlayer,
  };

  // Update game state
  const newPlayerHands = removeCardFromHand(playerHands, currentPlayer, playerCard);
  if (!newPlayerHands) {
    return gameState;
  }

  const newTableCards = removeCardsFromTable(tableCards, tableCardsInBuild);
  newTableCards.push(newBuild);

  const newState = updateGameState(gameState, {
    playerHands: newPlayerHands,
    tableCards: newTableCards,
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

export const handleBaseBuild = (gameState, playerCard, baseCard, otherCardsInBuild) => {
  const { playerHands, tableCards, currentPlayer } = gameState;

  // Remove playerCard from hand
  const newPlayerHands = removeCardFromHand(playerHands, currentPlayer, playerCard);
  if (!newPlayerHands) {
    return gameState;
  }

  // Remove baseCard and otherCardsInBuild from table
  const cardsToRemoveFromTable = [baseCard, ...otherCardsInBuild];
  const newTableCards = removeCardsFromTable(tableCards, cardsToRemoveFromTable);

  // Construct the new build's cards array (base at bottom, then other cards, then player card)
  const sortedOtherCards = sortCardsByRank(otherCardsInBuild);
  const buildCards = [baseCard, ...sortedOtherCards, playerCard];

  const newBuild = {
    buildId: generateBuildId(),
    type: 'build',
    cards: buildCards,
    value: playerCard.value,
    owner: currentPlayer,
  };

  newTableCards.push(newBuild);

  const newState = updateGameState(gameState, {
    playerHands: newPlayerHands,
    tableCards: newTableCards,
  });

  logGameState(`Player ${currentPlayer + 1} created a base build with a ${playerCard.rank}`, nextPlayer(newState));
  return nextPlayer(newState);
};

export const handleCapture = (gameState, selectedCard, selectedTableCards, opponentCard = null) => {
  const { playerHands, tableCards, playerCaptures, currentPlayer } = gameState;

  // Remove capturing card from hand
  const newPlayerHands = removeCardFromHand(playerHands, currentPlayer, selectedCard);
  if (!newPlayerHands) {
    return gameState;
  }

  // Remove captured cards from table
  const newTableCards = tableCards.filter(item => {
    if (item.type === 'build') {
      return !selectedTableCards.some(capturedItem => capturedItem.buildId === item.buildId);
    } else {
      return !selectedTableCards.some(capturedItem =>
        capturedItem.rank === item.rank && capturedItem.suit === item.suit
      );
    }
  });

  // Handle opponent's card removal if involved
  let newOpponentCaptures = [...playerCaptures];
  if (opponentCard) {
    const opponentIndex = 1 - currentPlayer; // Get opponent's index
    newOpponentCaptures[opponentIndex] = playerCaptures[opponentIndex].map(group =>
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
  const newPlayerCaptures = [...newOpponentCaptures];
  newPlayerCaptures[currentPlayer] = [...newPlayerCaptures[currentPlayer], capturedGroup];

  const newState = updateGameState(gameState, {
    playerHands: newPlayerHands,
    tableCards: newTableCards,
    playerCaptures: newPlayerCaptures,
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