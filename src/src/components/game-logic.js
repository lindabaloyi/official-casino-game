
// src/components/game-logic.js

/**
 * Initializes the game state, including shuffling the deck and dealing cards.
 * @returns {object} The initial game state.
 */
export const initializeGame = () => {
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  let deck = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank, value: rankValue(rank) });
    }
  }

  deck = shuffleDeck(deck);

  const playerHands = [[], []];
  for (let i = 0; i < 10; i++) {
    playerHands[0].push(deck.pop());
    playerHands[1].push(deck.pop());
  }

  return {
    deck,
    playerHands,
    tableCards: [],
    playerCaptures: [[], []],
    currentPlayer: 0,
    round: 1,
    scores: [0, 0],
    gameOver: false,
    winner: null,
  };
};

/**
 * Shuffles the deck of cards.
 * @param {Array} deck - The deck to shuffle.
 * @returns {Array} The shuffled deck.
 */
export const shuffleDeck = (deck) => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

/**
 * Converts a card's rank to its numeric value.
 * @param {string} rank - The rank of the card (e.g., 'A', '5', 'K').
 * @returns {number} The numeric value of the rank.
 */
export const rankValue = (rank) => {
  if (rank === 'A') return 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return parseInt(rank, 10);
};

/**
 * Logs the current state of the game for debugging purposes.
 * @param {string} moveDescription - A description of the move that just occurred.
 * @param {object} gameState - The game state to log.
 */
const logGameState = (moveDescription, gameState) => {
  // Using console.group to create collapsible log groups for better readability
  console.group(`%cMove: ${moveDescription}`, 'color: blue; font-weight: bold;');
  console.log('Table Cards:', JSON.parse(JSON.stringify(gameState.tableCards)));
  console.log('Player 1 Hand:', JSON.parse(JSON.stringify(gameState.playerHands[0])));
  console.log('Player 2 Hand:', JSON.parse(JSON.stringify(gameState.playerHands[1])));
  console.log('Player 1 Captures:', JSON.parse(JSON.stringify(gameState.playerCaptures[0])));
  console.log('Player 2 Captures:', JSON.parse(JSON.stringify(gameState.playerCaptures[1])));
  console.log(`Next turn: Player ${gameState.currentPlayer + 1}`);
  console.groupEnd();
};

/**
 * Handles trailing a card to the table.
 * @param {object} gameState - The current game state.
 * @param {object} card - The card to trail.
 * @returns {object} The new game state.
 */
export const handleTrail = (gameState, card) => {
  const { playerHands, tableCards, currentPlayer, round } = gameState;

  // New Rule: In round 1, a player cannot trail if they own a build.
  if (round === 1) {
    const playerOwnsBuild = tableCards.some(
      (c) => c.type === 'build' && c.owner === currentPlayer
    );
    if (playerOwnsBuild) {
      alert("You cannot trail a card while you own a build in the first round. You must capture or build.");
      return gameState; // Invalid move
    }
  }

  // Rule: You cannot trail a card if a loose card of the same rank is on the table.
  const looseCardRanks = tableCards
    .filter(c => !c.type) // Only check loose cards, not builds
    .map(c => c.rank);

  if (looseCardRanks.includes(card.rank)) {
    alert(`You cannot trail a ${card.rank} because one is already on the table.`);
    return gameState; // Invalid move, return original state.
  }

  // Remove the card from the player's hand
  const newPlayerHands = JSON.parse(JSON.stringify(playerHands));
  const hand = newPlayerHands[currentPlayer];
  const cardIndex = hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);

  if (cardIndex > -1) {
    hand.splice(cardIndex, 1);
  } else {
    console.error("Card to trail not found in player's hand.");
    return gameState; // Card not found, abort.
  }

  const newState = {
    ...gameState,
    playerHands: newPlayerHands,
    tableCards: [...tableCards, card],
    currentPlayer: (currentPlayer + 1) % 2,
  };

  logGameState(`Player ${currentPlayer + 1} trailed a ${card.rank}`, newState);
  return newState;
};

/**
 * Handles creating a build.
 * @param {object} gameState - The current game state.
 * @param {object} playerCard - The card played from the hand.
 * @param {Array} tableCardsInBuild - The cards from the table to include in the build.
 * @param {number} buildValue - The target value of the build.
 * @returns {object} The new game state.
 */
export const handleBuild = (gameState, playerCard, tableCardsInBuild, buildValue) => {
  const { playerHands, tableCards, currentPlayer } = gameState;
  const playerHand = playerHands[currentPlayer];

  // Validation 1: Player must have a card in hand that can capture this new build.
  // The card used for the build doesn't count.
  const canCaptureBuild = playerHand.some(
    c => rankValue(c.rank) === buildValue && (c.rank !== playerCard.rank || c.suit !== playerCard.suit)
  );
  if (!canCaptureBuild) {
    // This validation is now primarily handled in GameBoard.js before calling,
    // but it's good to keep it here as a safeguard.
    alert(`Cannot build ${buildValue}. You do not have a card of this value to capture it later.`);
    return gameState; // Invalid build, return original state.
  }

  // Validation 2: A player cannot create a build if an opponent already has a build of the same value.
  const opponentHasSameBuild = tableCards.some(
    item => item.type === 'build' && item.owner !== currentPlayer && item.value === buildValue
  );
  if (opponentHasSameBuild) {
    alert(`You cannot create a build of ${buildValue} because your opponent already has one.`);
    return gameState;
  }

  const allCardsInBuild = [playerCard, ...tableCardsInBuild];
  allCardsInBuild.sort((a, b) => rankValue(b.rank) - rankValue(a.rank));
  const sumOfCards = allCardsInBuild.reduce((sum, card) => sum + rankValue(card.rank), 0);

  // --- NEW VALIDATION LOGIC ---
  // A build is valid if it's a "Sum Build" OR a "Set Build".

  // Condition 1: Is it a valid "Sum Build"?
  const isSumBuild = sumOfCards === buildValue;

  // Condition 2: Is it a valid "Set Build"?
  const isSetBuild = allCardsInBuild.every(c => rankValue(c.rank) === buildValue);

  // The build must be one of these types, and its value cannot exceed 10.
  if ((!isSumBuild && !isSetBuild) || buildValue > 10) {
    alert(`Invalid build. Cards do not form a valid build of ${buildValue}.`);
    return gameState;
  }
  // --- END NEW VALIDATION LOGIC ---

  // Create the new build object
  const newBuild = {
    buildId: `build-${Date.now()}-${Math.random()}`, // Unique ID for the build
    type: 'build',
    cards: allCardsInBuild,
    value: buildValue,
    owner: currentPlayer,
  };

  // Remove the played card from the player's hand
  const newPlayerHands = JSON.parse(JSON.stringify(playerHands));
  const hand = newPlayerHands[currentPlayer];
  const cardIndex = hand.findIndex(c => c.rank === playerCard.rank && c.suit === playerCard.suit);
  if (cardIndex > -1) {
    hand.splice(cardIndex, 1);
  } else {
    console.error("Played card not found in hand.");
    return gameState;
  }

  // Remove the used cards from the table
  const tableCardIdentifiers = tableCardsInBuild.map(c => `${c.rank}-${c.suit}`);
  const newTableCards = tableCards.filter(c => {
    // Keep existing builds that are not part of this new build
    if (c.type === 'build') {
      return true;
    }
    // Filter out loose cards that are now in the new build
    return !tableCardIdentifiers.includes(`${c.rank}-${c.suit}`);
  });
  newTableCards.push(newBuild);

  const newState = {
    ...gameState,
    playerHands: newPlayerHands,
    tableCards: newTableCards,
    currentPlayer: (currentPlayer + 1) % 2,
  };

  logGameState(`Player ${currentPlayer + 1} built a ${buildValue}`, newState);
  return newState;
};

/**
 * Handles adding cards to an existing build.
 * @param {object} gameState - The current game state.
 * @param {object} playerCard - The card played from the hand.
 * @param {object} tableCard - The loose card from the table to add to the build.
 * @param {object} buildToAddTo - The build object being modified.
 * @returns {object} The new game state.
 */
export const handleAddToBuild = (gameState, playerCard, tableCard, buildToAddTo) => {
  const { playerHands, tableCards, currentPlayer } = gameState;

  // The new pair is added to the build.
  const newPair = [playerCard, tableCard];
  // Sort only the new pair for consistent stacking within the combo.
  newPair.sort((a, b) => rankValue(b.rank) - rankValue(a.rank));
  // Concatenate the new sorted pair to the end of the existing build's cards.
  const newBuildCards = [...buildToAddTo.cards, ...newPair];

  // Create the new build object, keeping the original value and owner.
  const newBuild = {
    ...buildToAddTo,
    cards: newBuildCards,
  };

  // --- Update Game State ---

  // 1. Remove played card from player's hand.
  const newPlayerHands = JSON.parse(JSON.stringify(playerHands));
  const hand = newPlayerHands[currentPlayer];
  const cardIndex = hand.findIndex(c => c.rank === playerCard.rank && c.suit === playerCard.suit);
  if (cardIndex > -1) {
    hand.splice(cardIndex, 1);
  }

  // 2. Remove the old build and the used loose card from the table.
  const newTableCards = tableCards.filter(item => {
    if (item.buildId === buildToAddTo.buildId) return false; // Remove old build
    if (!item.type && item.rank === tableCard.rank && item.suit === tableCard.suit) return false; // Remove loose card
    return true;
  });

  // 3. Add the new, larger build to the table.
  newTableCards.push(newBuild);

  const newState = {
    ...gameState,
    playerHands: newPlayerHands,
    tableCards: newTableCards,
    currentPlayer: (currentPlayer + 1) % 2,
  };
  logGameState(`Player ${currentPlayer + 1} added to build of ${newBuild.value}`, newState);
  return newState;
};

/**
 * Finds all valid captures for a given card.
 * @param {object} selectedCard - The card selected from the player's hand.
 * @param {Array} tableCards - The cards on the table.
 * @returns {Array} An array of valid captures.
 */
export const findValidCaptures = (selectedCard, tableCards) => {
  const validCaptures = [];
  const cardValue = selectedCard.value;

  // Helper function to find combinations
  const findCombinations = (cards, target) => {
    const result = [];
    const find = (startIndex, currentCombination, currentSum) => {
      if (currentSum === target) {
        result.push(currentCombination);
        return;
      }
      if (currentSum > target) {
        return;
      }
      for (let i = startIndex; i < cards.length; i++) {
        find(i + 1, [...currentCombination, cards[i]], currentSum + cards[i].value);
      }
    };
    find(0, [], 0);
    return result;
  };

  // 1. Find all combinations of loose cards that sum up to the card value
  const looseCards = tableCards.filter((c) => c.type !== 'build');
  const looseCardCombinations = findCombinations(looseCards, cardValue);
  for (const combination of looseCardCombinations) {
    validCaptures.push(combination);
  }

  // 2. Find all builds that can be captured
  const buildCaptures = tableCards.filter((c) => c.type === 'build' && c.value === cardValue);
  for (const build of buildCaptures) {
    validCaptures.push([build]);
  }

  return validCaptures;
};

/**
 * Finds all valid builds for a given card.
 * @param {object} selectedCard - The card selected from the player's hand.
 * @param {Array} tableCards - The cards on the table.
 * @returns {Array} An array of valid builds.
 */
export const findValidBuilds = (selectedCard, tableCards) => {
  const validBuilds = [];
  const cardValue = selectedCard.value;

  // Helper function to find combinations
  const findCombinations = (cards, target) => {
    const result = [];
    const find = (startIndex, currentCombination, currentSum) => {
      if (currentSum === target) {
        result.push(currentCombination);
        return;
      }
      if (currentSum > target) {
        return;
      }
      for (let i = startIndex; i < cards.length; i++) {
        find(i + 1, [...currentCombination, cards[i]], currentSum + cards[i].value);
      }
    };
    find(0, [], 0);
    return result;
  };

  // Find all combinations of loose cards that sum up to the cardValue
  const looseCards = tableCards.filter((c) => c.type !== 'build');
  const looseCardCombinations = findCombinations(looseCards, cardValue);
  for (const combination of looseCardCombinations) {
    validBuilds.push(combination);
  }

  return validBuilds;
};

/**
 * Handles capturing cards from the table.
 * @param {object} gameState - The current game state.
 * @param {object} selectedCard - The card selected from the player's hand.
 * @param {Array} selectedTableCards - The cards selected from the table to capture.
 * @returns {object} The new game state.
 */
export const handleCapture = (gameState, selectedCard, selectedTableCards) => {
  const { playerHands, tableCards, playerCaptures, currentPlayer } = gameState;

  // Create deep copies for safe mutation
  const newPlayerHands = JSON.parse(JSON.stringify(playerHands));
  const newPlayerCaptures = JSON.parse(JSON.stringify(playerCaptures));

  // Remove the selected card from the player's hand
  const hand = newPlayerHands[currentPlayer];
  const cardIndex = hand.findIndex(c => c.rank === selectedCard.rank && c.suit === selectedCard.suit);

  if (cardIndex > -1) {
    hand.splice(cardIndex, 1);
  } else {
    console.error("Card to capture with not found in player's hand.");
    return gameState; // Card not found, abort.
  }

  const capturedItemsIdentifiers = new Set(selectedTableCards.map(c => c.buildId ? c.buildId : `${c.rank}-${c.suit}`));

  // Remove the captured cards from the table
  const newTableCards = tableCards.filter(item => {
    if (item.type === 'build') {
      // If any card of this build is in the list of cards to capture, the whole build is captured.
      const isBuildCaptured = selectedTableCards.some(capturedItem => capturedItem.buildId === item.buildId);
      return !isBuildCaptured; // return false (remove it) if captured
    } else {
      // It's a loose card.
      return !capturedItemsIdentifiers.has(`${item.rank}-${item.suit}`);
    }
  });

  // Add the captured cards to the player's captures
  // The cards that form this specific capture event are grouped together.
  const capturedGroup = [selectedCard, ...selectedTableCards.flatMap(item => item.type === 'build' ? item.cards : item)];
  newPlayerCaptures[currentPlayer].push(capturedGroup);

  const newState = {
    ...gameState,
    playerHands: newPlayerHands,
    tableCards: newTableCards,
    playerCaptures: newPlayerCaptures,
    currentPlayer: (currentPlayer + 1) % 2,
  };

  logGameState(`Player ${currentPlayer + 1} captured with a ${selectedCard.rank}`, newState);
  return newState;
};

/**
 * Calculates the scores for each player.
 * @param {Array} playerCaptures - An array of captured cards for each player.
 * @returns {Array} An array of scores for each player.
 */
export const calculateScores = (playerCaptures) => {
  const scores = [0, 0];

  // Flatten the captured groups for each player to get a simple list of cards for scoring
  const flatPlayerCaptures = playerCaptures.map(captureGroups => captureGroups.flat());

  flatPlayerCaptures.forEach((captures, playerIndex) => {
    let score = 0;
    for (const card of captures) {
      if (card.rank === 'A') {
        score += 1;
      } else if (card.rank === '10' && card.suit === '♦') {
        score += 2;
      } else if (card.rank === '2' && card.suit === '♠') {
        score += 1;
      }
    }
    scores[playerIndex] = score;
  });

  // Add bonus points for the player with the most cards
  if (flatPlayerCaptures[0].length > flatPlayerCaptures[1].length) {
    scores[0] += 3;
  } else if (flatPlayerCaptures[1].length > flatPlayerCaptures[0].length) {
    scores[1] += 3;
  }

  return scores;
};

/**
 * Checks if the round is over.
 * @param {object} gameState - The current game state.
 * @returns {boolean} True if the round is over, false otherwise.
 */
export const isRoundOver = (gameState) => {
  return gameState.playerHands.every((hand) => hand.length === 0);
};

/**
 * Checks if the game is over.
 * @param {object} gameState - The current game state.
 * @returns {boolean} True if the game is over, false otherwise.
 */
export const isGameOver = (gameState) => {
  return gameState.round === 2 && isRoundOver(gameState);
};
