/**
 * Card Operations Module
 * Contains all card manipulation and utility functions
 */

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
 * Creates a unique identifier for a card based on rank and suit.
 * @param {object} card - The card object.
 * @returns {string} Unique card identifier.
 */
export const getCardId = (card) => `${card.rank}-${card.suit}`;

/**
 * Efficiently removes a card from a player's hand without deep cloning.
 * @param {Array} playerHands - The current player hands.
 * @param {number} currentPlayer - The index of the current player.
 * @param {object} cardToRemove - The card to remove.
 * @returns {Array|null} Updated player hands or null if card not found.
 */
export const removeCardFromHand = (playerHands, currentPlayer, cardToRemove) => {
  const newPlayerHands = [...playerHands];
  const hand = [...newPlayerHands[currentPlayer]];
  const cardIndex = hand.findIndex(c =>
    c.rank === cardToRemove.rank && c.suit === cardToRemove.suit
  );

  if (cardIndex > -1) {
    hand.splice(cardIndex, 1);
    newPlayerHands[currentPlayer] = hand;
    return newPlayerHands;
  }

  console.error("Card to remove not found in player's hand.");
  return null;
};

/**
 * Removes multiple cards from the table efficiently.
 * @param {Array} tableCards - The current table cards.
 * @param {Array} cardsToRemove - The cards to remove from the table.
 * @returns {Array} Updated table cards.
 */
export const removeCardsFromTable = (tableCards, cardsToRemove) => {
  const identifiers = new Set(
    cardsToRemove.map(c => c.buildId ? c.buildId : getCardId(c))
  );

  return tableCards.filter(item => {
    if (item.type === 'build') {
      return !identifiers.has(item.buildId);
    } else {
      return !identifiers.has(getCardId(item));
    }
  });
};



/**
 * Sorts cards by their rank value in ascending order.
 * @param {Array} cards - The cards to sort.
 * @returns {Array} Sorted cards.
 */
export const sortCardsByRank = (cards) => {
  return [...cards].sort((a, b) => rankValue(a.rank) - rankValue(b.rank));
};

/**
 * Calculates the total value of a combination of cards.
 * @param {Array} cards - The cards to sum.
 * @returns {number} The total value.
 */
export const calculateCardSum = (cards) => {
  return cards.reduce((sum, card) => sum + rankValue(card.rank), 0);
};

/**
 * Creates a unique build ID.
 * @returns {string} A unique build identifier.
 */
export const generateBuildId = () => {
  return `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validates if a card combination forms a valid build type.
 * @param {Array} cards - The cards in the build.
 * @param {number} targetValue - The target build value.
 * @returns {boolean} True if the build is valid.
 */
export const isValidBuildType = (cards, targetValue) => {
  const sum = calculateCardSum(cards);
  const isSumBuild = sum === targetValue;
  const isSetBuild = cards.every(c => rankValue(c.rank) === targetValue);
  return (isSumBuild || isSetBuild) && targetValue <= 10;
};