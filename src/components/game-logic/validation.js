/**
 * Validation Module
 * Contains all validation logic for game moves and state
 */

import { rankValue, calculateCardSum, isValidBuildType } from './card-operations.js';
import { canPartitionIntoSums } from './algorithms.js';

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
  if (!build.isExtendable || build.cards.length >= 5) {
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

export const validateAddToOwnBuild = (build, playerCard, playerHand) => {
  const cardValue = rankValue(playerCard.rank);
  const remainingHand = playerHand.filter(c => c.rank !== playerCard.rank || c.suit !== playerCard.suit);

  // Case 1: Reinforcing a build (e.g., adding a 7 to a build of 7)
  if (cardValue === build.value) {
    // Player must have another card of the same value to capture later
    const canCapture = remainingHand.some(c => rankValue(c.rank) === build.value);
    if (!canCapture) {
      return { valid: false, message: `You must have another ${build.value} in your hand to reinforce this build.` };
    }
    return { valid: true, newValue: build.value }; // The value doesn't change
  }

  // Case 2: Increasing a build's value (e.g., adding a 2 to a build of 5)
  const newValue = build.value + cardValue;

  // Rule 2a: New value must be <= 10
  if (newValue > 10) {
    return { valid: false, message: `Cannot add to build. New value (${newValue}) would be over 10.` };
  }

  // Rule 2b: Player must have a backup card to capture the new value
  const canCaptureNewValue = remainingHand.some(c => rankValue(c.rank) === newValue);
  if (!canCaptureNewValue) {
    return { valid: false, message: `You must have a ${newValue} in your hand to make this new build.` };
  }

  // Rule 2c: Build cannot become too large
  if (build.cards.length >= 5) {
    return { valid: false, message: "This build cannot be extended further." };
  }

  return { valid: true, newValue };
};

export const validateTemporaryStackBuild = (stack, handCard, playerHand, tableCards, currentPlayer) => {
  // Rule 1: Player cannot already have a build
  const playerAlreadyHasBuild = tableCards.some(
    item => item.type === 'build' && item.owner === currentPlayer
  );
  if (playerAlreadyHasBuild) {
    return { valid: false, message: "You can only have one build at a time." };
  }

  const remainingHand = playerHand.filter(c => c.rank !== handCard.rank || c.suit !== handCard.suit);
  const stackValue = calculateCardSum(stack.cards);
  const handCardValue = rankValue(handCard.rank);

  // Case 1: Reinforcing a temporary stack to create a permanent build (e.g., dropping a 10 on a stack of 10)
  if (stackValue === handCardValue) {
    const buildValue = stackValue;
    const canCapture = remainingHand.some(c => rankValue(c.rank) === buildValue);
    if (!canCapture) {
      return { valid: false, message: `You must have another ${buildValue} in your hand to create this build.` };
    }
    return { valid: true, newValue: buildValue };
  }

  // Case 2: Increasing a temporary stack's value to create a permanent build (e.g., dropping a 2 on a stack of 8)
  const newBuildValue = stackValue + handCardValue;
  if (newBuildValue > 10) {
    return { valid: false, message: `Cannot build. The total value (${newBuildValue}) would be over 10.` };
  }

  const canCaptureNewValue = remainingHand.some(c => rankValue(c.rank) === newBuildValue);
  if (!canCaptureNewValue) {
    return { valid: false, message: `You must have a ${newBuildValue} in your hand to make this build.` };
  }

  return { valid: true, newValue: newBuildValue };
};

export const validateReinforceBuildWithStack = (stack, targetBuild) => {
  // Rule 1: The stack must contain exactly one card from the player's hand.
  const handCardsInStack = stack.cards.filter(c => c.source === 'hand');
  if (handCardsInStack.length !== 1) {
    return {
      valid: false,
      message: "You must use exactly one card from your hand to add to a build."
    };
  }

  // Rule 2: The cards in the stack must be partitionable into groups that sum to the target build's value.
  const cardsForPartition = stack.cards.map(({ source, ...card }) => card); // Strip source for validation
  if (!canPartitionIntoSums(cardsForPartition, targetBuild.value)) {
    return {
      valid: false,
      message: `The cards in your stack cannot be grouped to match the build value of ${targetBuild.value}.`
    };
  }

  return { valid: true };
};

/**
 * Validates if a temporary stack (containing only table cards) can be merged into the player's own build.
 * This action does not end the turn.
 * @param {object} stack - The temporary stack to merge.
 * @param {object} targetBuild - The player's own build to merge into.
 * @param {number} currentPlayer - The index of the current player.
 * @returns {object} Validation result with valid flag and message.
 */
export const validateMergeIntoOwnBuild = (stack, targetBuild, currentPlayer) => {
  // Rule 1: Target build must be owned by the current player.
  if (targetBuild.owner !== currentPlayer) {
    return {
      valid: false,
      message: "You can only merge table cards into your own build."
    };
  }

  // Rule 2: The stack must contain zero cards from the player's hand.
  if (stack.cards.some(c => c.source === 'hand')) {
    return { valid: false, message: "This action is for merging table cards only." };
  }

  // Rule 3: The cards in the stack must be partitionable into groups that sum to the target build's value.
  const cardsForPartition = stack.cards.map(({ source, ...card }) => card);
  if (!canPartitionIntoSums(cardsForPartition, targetBuild.value)) {
    return { valid: false, message: `The cards in your stack cannot be grouped to match the build value of ${targetBuild.value}.` };
  }

  return { valid: true };
};

/**
 * Validates if a player can extend an opponent's build to merge it into their own.
 * @param {object} ownBuild - The player's own active build.
 * @param {object} opponentBuild - The opponent's build to be extended.
 * @param {object} handCard - The card from the player's hand used to extend.
 * @returns {object} Validation result with valid flag and message.
 */
export const validateExtendToMerge = (ownBuild, opponentBuild, handCard) => {
  // Rule 1: Opponent's build must be extendable (not a base build or reinforced).
  if (!opponentBuild.isExtendable) {
    return {
      valid: false,
      message: "This build cannot be extended."
    };
  }

  // Rule 2: Calculate the potential new value.
  const newValue = opponentBuild.value + rankValue(handCard.rank);

  // Rule 3: The new value must match the player's own build value.
  if (newValue !== ownBuild.value) {
    return { valid: false, message: `Cannot merge. The combined value (${newValue}) does not match your build of ${ownBuild.value}.` };
  }

  return { valid: true };
};

/**
 * Validates if a temporary stack can be finalized into a new, permanent build.
 * @param {object} stack - The temporary stack to be finalized.
 * @param {Array} playerHand - The hand of the current player.
 * @param {Array} tableCards - The cards on the table.
 * @param {number} currentPlayer - The index of the current player.
 * @returns {object} Validation result with valid flag and message.
 */
export const validateFinalizeStagingStack = (stack, playerHand, tableCards, currentPlayer) => {
  // Rule 1: Player cannot already have a build
  const playerAlreadyHasBuild = tableCards.some(
    item => item.type === 'build' && item.owner === currentPlayer
  );
  if (playerAlreadyHasBuild) {
    return { valid: false, message: "You already have a build. You can only add to it." };
  }

  // Rule 2: The stack must contain exactly one card from the player's hand.
  const handCardsInStack = stack.cards.filter(c => c.source === 'hand');
  if (handCardsInStack.length !== 1) {
    return { valid: false, message: "A new build must be made with one card from your hand." };
  }

  // Rule 3: Player must have a card in hand to capture the new build.
  const buildValue = calculateCardSum(stack.cards.map(({ source, ...card }) => card));
  const handCardUsed = handCardsInStack[0];
  const remainingHand = playerHand.filter(c => c.rank !== handCardUsed.rank || c.suit !== handCardUsed.suit);

  const canCapture = remainingHand.some(c => rankValue(c.rank) === buildValue);
  if (!canCapture) {
    return { valid: false, message: `You must have a ${buildValue} in your hand to create this build.` };
  }

  return { valid: true, buildValue };
};

/**
 * Validates if a temporary stack (containing only table cards) can be used to reinforce an opponent's build.
 * This is a staging action that does not end the turn.
 * @param {object} stack - The temporary stack to merge.
 * @param {object} opponentBuild - The opponent's build to reinforce.
 * @param {number} currentPlayer - The index of the current player.
 * @returns {object} Validation result with valid flag and message.
 */
export const validateReinforceOpponentBuildWithStack = (stack, opponentBuild, currentPlayer) => {
  // Rule 1: Target build must NOT be owned by the current player.
  if (opponentBuild.owner === currentPlayer) {
    return { valid: false, message: "This action is for reinforcing an opponent's build." };
  }

  // Rule 2: The stack must contain zero cards from the player's hand.
  if (stack.cards.some(c => c.source === 'hand')) {
    return { valid: false, message: "You cannot use a hand card for this type of reinforcement." };
  }

  // Rule 3: Opponent's build must be extendable.
  if (!opponentBuild.isExtendable) {
    return { valid: false, message: "This build cannot be extended." };
  }

  // Rule 4: The cards in the stack must be partitionable into groups that sum to the target build's value.
  const cardsForPartition = stack.cards.map(({ source, ...card }) => card);
  if (!canPartitionIntoSums(cardsForPartition, opponentBuild.value)) {
    return { valid: false, message: `The cards in your stack cannot be grouped to match the build value of ${opponentBuild.value}.` };
  }

  return { valid: true };
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