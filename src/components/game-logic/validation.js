/**
 * Validation Module
 * Contains all validation logic for game moves and state
 */

import { rankValue, calculateCardSum, isValidBuildType } from './card-operations.js';

/**
 * Validates if a build can be created with the given parameters.
 * @param {Array} playerHand - The current player's hand.
 * @param {object} playerCard - The card played from the hand.
 * @param {number} buildValue - The target value of the build.
 * @param {Array} tableCards - The cards on the table.
 * @param {number} currentPlayer - The index of the current player.
 * @returns {boolean} True if the build is valid.
 */
export const validateBuild = (playerHand, playerCard, buildValue, tableCards, currentPlayer) => {
  // Check if player already owns a build
  const playerAlreadyHasBuild = tableCards.some(
    item => item.type === 'build' && item.owner === currentPlayer
  );

  if (playerAlreadyHasBuild) {
    return {
      valid: false,
      message: "You can only have one build at a time."
    };
  }

  // Check if player has a card to capture this build later
  const canCaptureBuild = playerHand.some(
    c => rankValue(c.rank) === buildValue &&
        (c.rank !== playerCard.rank || c.suit !== playerCard.suit)
  );

  if (!canCaptureBuild) {
    return {
      valid: false,
      message: `Cannot build ${buildValue}. You do not have a card of this value to capture it later.`
    };
  }

  // Check if opponent already has a build of the same value
  const opponentHasSameBuild = tableCards.some(
    item => item.type === 'build' &&
           item.owner !== currentPlayer &&
           item.value === buildValue
  );

  if (opponentHasSameBuild) {
    return {
      valid: false,
      message: `You cannot create a build of ${buildValue} because your opponent already has one.`
    };
  }

  return { valid: true };
};

/**
 * Validates if a complex build (multi-card) is valid.
 * @param {Array} stagedCards - The cards staged for the build.
 * @param {Array} playerHand - The current player's hand.
 * @param {number} currentPlayer - The index of the current player.
 * @returns {object} Validation result with valid flag and message.
 */


/**
 * Validates if a complex capture is valid.
 * @param {Array} stagedCards - The cards staged for capture.
 * @param {object} captureCard - The card used to capture.
 * @returns {object} Validation result with valid flag and message.
 */
export const validateComplexCapture = (stagedCards, captureCard) => {
  // All cards must be from the table
  const allFromTable = stagedCards.every(c => c.source === 'table');
  if (!allFromTable) {
    return {
      valid: false,
      message: "All cards in a capture must be from the table."
    };
  }

  const totalValue = calculateCardSum(stagedCards);
  const captureValue = rankValue(captureCard.rank);

  if (totalValue !== captureValue) {
    return {
      valid: false,
      message: `Capture value (${captureValue}) does not match staged cards total (${totalValue}).`
    };
  }

  return { valid: true };
};

/**
 * Validates if a trail action is allowed.
 * @param {Array} tableCards - The cards on the table.
 * @param {object} card - The card to trail.
 * @param {number} currentPlayer - The index of the current player.
 * @param {number} round - The current round number.
 * @returns {object} Validation result with valid flag and message.
 */
export const validateTrail = (tableCards, card, currentPlayer, round) => {
  // Round 1 restriction: cannot trail if you own a build
  if (round === 1 && tableCards.some(c => c.type === 'build' && c.owner === currentPlayer)) {
    return {
      valid: false,
      message: "You cannot trail a card while you own a build in the first round. You must capture or build."
    };
  }

  // Cannot trail a card if one of the same rank is already on the table
  if (tableCards.some(c => !c.type && c.rank === card.rank)) {
    return {
      valid: false,
      message: `You cannot trail a ${card.rank} because one is on the table. Try dragging to capture.`
    };
  }

  return { valid: true };
};

/**
 * Validates if a card can be added to an existing build.
 * @param {object} buildToAddTo - The build to add to.
 * @param {object} playerCard - The card from hand.
 * @param {object} tableCard - The loose card to add.
 * @param {Array} playerHand - The current player's hand.
 * @returns {object} Validation result with valid flag and message.
 */
export const validateAddToBuild = (buildToAddTo, playerCard, tableCard, playerHand) => {
  const newValue = buildToAddTo.value + rankValue(playerCard.rank) + rankValue(tableCard.rank);

  // Check if player can capture the new build value
  const canCapture = playerHand.some(c =>
    rankValue(c.rank) === newValue &&
    (c.rank !== playerCard.rank || c.suit !== playerCard.suit)
  );

  if (!canCapture) {
    return {
      valid: false,
      message: `Cannot add to build. You need a card with value ${newValue} to capture it later.`
    };
  }

  return { valid: true };
};

export const validateAddToOpponentBuild = (build, playerCard, playerHand, tableCards, currentPlayer) => {
  // Rule 1: Cannot add to your own build with this action
  if (build.owner === currentPlayer) {
    // This case is handled separately for "add to own build"
    return { valid: false, message: "You cannot use this action on your own build." };
  }

  // Rule 2: Player cannot already have a build of their own
  const playerAlreadyHasBuild = tableCards.some(
    item => item.type === 'build' && item.owner === currentPlayer
  );
  if (playerAlreadyHasBuild) {
    return { valid: false, message: "You cannot extend an opponent's build while you have your own." };
  }

  // Rule 3: Build must be simple and extendable
  if (!build.isExtendable || build.cards.length >= 4) {
    return { valid: false, message: "This build cannot be extended." };
  }

  // Rule 4: New value must be <= 10
  const newValue = build.value + rankValue(playerCard.rank);
  if (newValue > 10) {
    return { valid: false, message: `Cannot extend build. New value (${newValue}) would be over 10.` };
  }

  // Rule 5: Player must have the capture card in hand
  const canCapture = playerHand.some(c =>
    rankValue(c.rank) === newValue &&
    (c.rank !== playerCard.rank || c.suit !== playerCard.suit)
  );
  if (!canCapture) {
    return { valid: false, message: `You must have a ${newValue} in your hand to make this build.` };
  }

  return { valid: true, newValue };
};

/**
 * Validates game state integrity.
 * @param {object} gameState - The current game state.
 * @returns {object} Validation result with valid flag and issues array.
 */
export const validateGameState = (gameState) => {
  const issues = [];

  // Check player hands
  if (!Array.isArray(gameState.playerHands) || gameState.playerHands.length !== 2) {
    issues.push("Invalid player hands structure");
  }

  // Check table cards
  if (!Array.isArray(gameState.tableCards)) {
    issues.push("Invalid table cards structure");
  }

  // Check captured cards
  if (!Array.isArray(gameState.playerCaptures) || gameState.playerCaptures.length !== 2) {
    issues.push("Invalid player captures structure");
  }

  // Check current player
  if (typeof gameState.currentPlayer !== 'number' || gameState.currentPlayer < 0 || gameState.currentPlayer > 1) {
    issues.push("Invalid current player index");
  }

  // Check round
  if (typeof gameState.round !== 'number' || gameState.round < 1 || gameState.round > 2) {
    issues.push("Invalid round number");
  }

  return {
    valid: issues.length === 0,
    issues
  };
};