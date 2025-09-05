/**
 * Algorithms Module
 * Contains optimized algorithms for card combination finding and game logic
 */

import { rankValue } from './card-operations.js';

/**
 * Optimized dynamic programming approach for finding card combinations.
 * Much more efficient than the recursive approach for larger card sets.
 * @param {Array} cards - Array of card objects to find combinations from.
 * @param {number} target - The target sum value.
 * @returns {Array} Array of valid combinations that sum to the target.
 */
export const findCombinationsDP = (cards, target) => {
  // Validate target to prevent invalid array creation
  if (target < 0) {
    return [];
  }

  // Initialize DP table: dp[i] will contain all combinations that sum to i
  const dp = Array(target + 1).fill().map(() => []);

  // Base case: empty combination sums to 0
  dp[0] = [[]];

  // Process each card
  for (const card of cards) {
    const cardValue = rankValue(card.rank);

    // Work backwards to avoid using the same card multiple times
    for (let sum = target; sum >= cardValue; sum--) {
      // For each existing combination that sums to (sum - cardValue)
      for (const combination of dp[sum - cardValue]) {
        // Add this card to create a new combination
        dp[sum].push([...combination, card]);
      }
    }
  }

  return dp[target];
};

/**
 * Checks if a given array of cards can be partitioned into subsets that each sum to a target value.
 * @param {Array<object>} cards - The array of card objects to partition.
 * @param {number} targetSum - The target sum for each subset.
 * @returns {boolean} True if a valid partition exists, false otherwise.
 */
export const canPartitionIntoSums = (cards, targetSum) => {
  if (cards.length === 0) {
    return true; // Base case: all cards have been successfully partitioned.
  }

  // Find all possible combinations that sum to the target from the current set of cards.
  const combinations = findCombinationsDP(cards, targetSum);

  if (combinations.length === 0) {
    return false; // No combination can be formed from the remaining cards.
  }

  // Try to recurse with the remaining cards for each found combination.
  for (const combo of combinations) {
    const remainingCards = [...cards];
    // Remove the cards from the current combination.
    for (const cardInCombo of combo) {
      const index = remainingCards.findIndex(c => c.rank === cardInCombo.rank && c.suit === cardInCombo.suit);
      if (index !== -1) {
        remainingCards.splice(index, 1);
      }
    }

    // If a valid partition is found for the rest of the cards, we're done.
    if (canPartitionIntoSums(remainingCards, targetSum)) {
      return true;
    }
  }

  // If no combination leads to a full partition, then it's not possible.
  return false;
};






/**
 * Finds combinations of cards that, when added to a baseCard, sum up to the playedCard.value.
 * @param {object} playedCard - The card played from the player's hand.
 * @param {object} baseCard - The loose card on the table that will serve as the base.
 * @param {Array} allTableCards - All loose cards currently on the table.
 * @returns {Array} An array of combinations of other cards that form the build.
 */
export const findBaseBuilds = (playedCard, baseCard, allTableCards) => {
  const targetSum = rankValue(playedCard.rank);
  const remainingCards = allTableCards.filter(c =>
    c.rank !== baseCard.rank || c.suit !== baseCard.suit
  );

  return findCombinationsDP(remainingCards, targetSum - rankValue(baseCard.rank));
};
